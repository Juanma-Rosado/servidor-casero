from flask import Flask, render_template, request, redirect, url_for, session, jsonify, abort
import mysql.connector
import phpserialize
import os
import hmac
import secrets
from datetime import datetime
from functools import wraps


# Restauración de 2026-11: las contraseñas ya no están escritas en el código.
# Si falta alguna variable de entorno, la app no arranca en vez de usar una por defecto.
def leerVariableObligatoria(nombre):
    valor = os.environ.get(nombre, '')
    if not valor:
        raise RuntimeError(f'Falta la variable de entorno {nombre}')
    return valor


app = Flask(__name__)
app.secret_key = leerVariableObligatoria('SECRET_KEY')
# La cookie de sesión no se envía desde otras webs (ayuda contra CSRF)
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'db-restaurante'),
    'port': int(os.environ.get('DB_PORT', 3306)),
    'user': os.environ.get('DB_USER', 'gestion'),
    'password': leerVariableObligatoria('DB_PASSWORD'),
    'database': os.environ.get('DB_NAME', 'restaurante_db'),
    'charset': 'utf8mb4'
}

APP_USER = leerVariableObligatoria('APP_USER')
APP_PASSWORD = leerVariableObligatoria('APP_PASSWORD')
RESTAURANT_NAME = os.environ.get('RESTAURANT_NAME', 'Echale Queso')


# Protección CSRF: cada sesión tiene un token secreto que va oculto en todos los
# formularios POST. Una web ajena no lo conoce, así que no puede cancelar ni borrar
# reservas aprovechando que el personal tiene la sesión abierta.
def obtenerTokenFormulario():
    if 'csrf_token' not in session:
        session['csrf_token'] = secrets.token_urlsafe(32)
    return session['csrf_token']


@app.context_processor
def anadirTokenAPlantillas():
    return {'csrf_token': obtenerTokenFormulario()}


@app.before_request
def comprobarTokenFormulario():
    if request.method != 'POST':
        return None
    tokenEnviado = request.form.get('csrf_token', '')
    tokenSesion = session.get('csrf_token', '')
    tokenCorrecto = hmac.compare_digest(tokenEnviado.encode('utf-8'), tokenSesion.encode('utf-8'))
    if not tokenSesion or not tokenCorrecto:
        abort(400)
    return None

def get_db():
    return mysql.connector.connect(**DB_CONFIG)

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

def deserialize_php(value):
    if not value or not value.startswith('a:'):
        return value
    try:
        data = phpserialize.loads(value.encode('utf-8'))
        if isinstance(data, dict):
            return list(data.values())[0].decode('utf-8') if data else ''
        return value
    except Exception:
        return value

def get_reservas():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT p.ID, p.post_date, p.post_status
        FROM wp_posts p
        WHERE p.post_type = 'flamingo_inbound'
        ORDER BY p.post_date DESC
    """)
    posts = cursor.fetchall()
    reservas = []
    for post in posts:
        cursor.execute("""
            SELECT meta_key, meta_value FROM wp_postmeta
            WHERE post_id = %s
            AND meta_key IN (
                '_field_nombre', '_field_telefono', '_field_email',
                '_field_comensales', '_field_fecha', '_field_hora',
                '_field_ocasion', '_field_comentarios', '_submission_status'
            )
        """, (post['ID'],))
        meta = {row['meta_key']: row['meta_value'] for row in cursor.fetchall()}
        reserva = {
            'id': post['ID'],
            'fecha_envio': post['post_date'].strftime('%d/%m/%Y %H:%M'),
            'estado': meta.get('_submission_status', 'mail_sent'),
            'nombre': meta.get('_field_nombre', '-'),
            'telefono': meta.get('_field_telefono', '-'),
            'email': meta.get('_field_email', '-'),
            'comensales': deserialize_php(meta.get('_field_comensales', '')),
            'fecha': meta.get('_field_fecha', '-'),
            'hora': deserialize_php(meta.get('_field_hora', '')),
            'ocasion': deserialize_php(meta.get('_field_ocasion', '')),
            'comentarios': meta.get('_field_comentarios', ''),
        }
        if reserva['fecha'] and reserva['fecha'] != '-':
            try:
                dt = datetime.strptime(reserva['fecha'], '%Y-%m-%d')
                reserva['fecha_formateada'] = dt.strftime('%d/%m/%Y')
                reserva['fecha_raw'] = reserva['fecha']
            except Exception:
                reserva['fecha_formateada'] = reserva['fecha']
                reserva['fecha_raw'] = reserva['fecha']
        else:
            reserva['fecha_formateada'] = '-'
            reserva['fecha_raw'] = ''
        reservas.append(reserva)
    cursor.close()
    conn.close()
    return reservas

def get_reserva(reserva_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT p.ID, p.post_date FROM wp_posts p
        WHERE p.ID = %s AND p.post_type = 'flamingo_inbound'
    """, (reserva_id,))
    post = cursor.fetchone()
    if not post:
        cursor.close()
        conn.close()
        return None
    cursor.execute("""
        SELECT meta_key, meta_value FROM wp_postmeta
        WHERE post_id = %s
        AND meta_key IN (
            '_field_nombre', '_field_telefono', '_field_email',
            '_field_comensales', '_field_fecha', '_field_hora',
            '_field_ocasion', '_field_comentarios', '_submission_status'
        )
    """, (reserva_id,))
    meta = {row['meta_key']: row['meta_value'] for row in cursor.fetchall()}
    cursor.close()
    conn.close()
    return {
        'id': post['ID'],
        'fecha_envio': post['post_date'].strftime('%d/%m/%Y %H:%M'),
        'estado': meta.get('_submission_status', 'mail_sent'),
        'nombre': meta.get('_field_nombre', ''),
        'telefono': meta.get('_field_telefono', ''),
        'email': meta.get('_field_email', ''),
        'comensales': deserialize_php(meta.get('_field_comensales', '')),
        'fecha': meta.get('_field_fecha', ''),
        'hora': deserialize_php(meta.get('_field_hora', '')),
        'ocasion': deserialize_php(meta.get('_field_ocasion', '')),
        'comentarios': meta.get('_field_comentarios', ''),
    }

def update_field(reserva_id, field, value):
    conn = get_db()
    cursor = conn.cursor()
    meta_key = f'_field_{field}'
    serialized_fields = ['comensales', 'hora', 'ocasion']
    if field in serialized_fields:
        value_to_save = f'a:1:{{i:0;s:{len(value.encode("utf-8"))}:"{value}";}}'
    else:
        value_to_save = value
    cursor.execute("""
        UPDATE wp_postmeta SET meta_value = %s
        WHERE post_id = %s AND meta_key = %s
    """, (value_to_save, reserva_id, meta_key))
    conn.commit()
    cursor.close()
    conn.close()

def cancelar_reserva(reserva_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE wp_postmeta SET meta_value = 'cancelada'
        WHERE post_id = %s AND meta_key = '_submission_status'
    """, (reserva_id,))
    conn.commit()
    cursor.close()
    conn.close()

@app.route('/')
def index():
    if 'logged_in' in session:
        return redirect(url_for('reservas'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        user = request.form.get('usuario', '')
        pwd = request.form.get('password', '')
        # compare_digest tarda lo mismo acierte o falle: no da pistas por el tiempo de respuesta
        # Se comparan bytes: con texto, compare_digest falla si alguien escribe una tilde
        usuarioCorrecto = hmac.compare_digest(user.encode('utf-8'), APP_USER.encode('utf-8'))
        contrasenaCorrecta = hmac.compare_digest(pwd.encode('utf-8'), APP_PASSWORD.encode('utf-8'))
        if usuarioCorrecto and contrasenaCorrecta:
            # Sesión nueva al entrar, para no reutilizar una anterior
            session.clear()
            session['logged_in'] = True
            session['usuario'] = user
            return redirect(url_for('reservas'))
        else:
            error = 'Usuario o contrasena incorrectos.'
    return render_template('login.html', error=error, restaurant=RESTAURANT_NAME)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/reservas')
@login_required
def reservas():
    todas = get_reservas()
    filtro_estado = request.args.get('estado', 'todas')
    filtro_fecha = request.args.get('fecha', '')
    busqueda = request.args.get('busqueda', '').lower()
    if filtro_estado != 'todas':
        todas = [r for r in todas if r['estado'] == filtro_estado]
    if filtro_fecha:
        todas = [r for r in todas if r['fecha_raw'] == filtro_fecha]
    if busqueda:
        todas = [r for r in todas if
                 busqueda in r['nombre'].lower() or
                 busqueda in r['email'].lower() or
                 busqueda in r['telefono'].lower()]
    return render_template('reservas.html',
                           reservas=todas,
                           restaurant=RESTAURANT_NAME,
                           filtro_estado=filtro_estado,
                           filtro_fecha=filtro_fecha,
                           busqueda=busqueda)

@app.route('/reserva/<int:reserva_id>')
@login_required
def detalle_reserva(reserva_id):
    reserva = get_reserva(reserva_id)
    if not reserva:
        return redirect(url_for('reservas'))
    return render_template('detalle.html', reserva=reserva, restaurant=RESTAURANT_NAME)

@app.route('/reserva/<int:reserva_id>/editar', methods=['GET', 'POST'])
@login_required
def editar_reserva(reserva_id):
    reserva = get_reserva(reserva_id)
    if not reserva:
        return redirect(url_for('reservas'))
    if request.method == 'POST':
        campos = ['nombre', 'telefono', 'email', 'comensales', 'fecha', 'hora', 'ocasion', 'comentarios']
        for campo in campos:
            valor = request.form.get(campo, '')
            update_field(reserva_id, campo, valor)
        return redirect(url_for('detalle_reserva', reserva_id=reserva_id))
    horas = ['13:00','13:30','14:00','14:30','15:00','15:30',
             '20:00','20:30','21:00','21:30','22:00','22:30']
    comensales = ['1 persona','2 personas','3 personas','4 personas',
                  '5 personas','6 personas','7 personas','8 personas','Mas de 8 (consultar)']
    ocasiones = ['Sin ocasion especial','Cumpleanos','Aniversario',
                 'Cena de empresa','Pedida de mano','Otra ocasion']
    return render_template('editar.html',
                           reserva=reserva,
                           restaurant=RESTAURANT_NAME,
                           horas=horas,
                           comensales=comensales,
                           ocasiones=ocasiones)

@app.route('/reserva/<int:reserva_id>/cancelar', methods=['POST'])
@login_required
def cancelar(reserva_id):
    cancelar_reserva(reserva_id)
    return redirect(url_for('reservas'))

@app.route('/reserva/<int:reserva_id>/reactivar', methods=['POST'])
@login_required
def reactivar(reserva_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE wp_postmeta SET meta_value = 'mail_sent'
        WHERE post_id = %s AND meta_key = '_submission_status'
    """, (reserva_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return redirect(url_for('reservas'))

@app.route('/reserva/<int:reserva_id>/borrar', methods=['POST'])
@login_required
def borrar(reserva_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM wp_postmeta WHERE post_id = %s", (reserva_id,))
    cursor.execute("DELETE FROM wp_posts WHERE ID = %s AND post_type = 'flamingo_inbound'", (reserva_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return redirect(url_for('reservas'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
