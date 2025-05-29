import os
import json
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, send_from_directory, jsonify
from werkzeug.utils import secure_filename
import uuid # Para nombres de archivo únicos

app = Flask(__name__)

# --- Configuración ---
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'IMAGENES')
METADATA_FILE = os.path.join(BASE_DIR, 'metadata.json')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB límite por subida total

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# --- Funciones Auxiliares ---
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_metadata():
    if not os.path.exists(METADATA_FILE):
        return []
    try:
        with open(METADATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError: # Si el archivo está corrupto o vacío
        return []

def save_metadata(data):
    with open(METADATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# --- Rutas ---
@app.route('/')
def index():
    return redirect(url_for('upload_page'))

@app.route('/upload', methods=['GET', 'POST'])
def upload_page():
    if request.method == 'POST':
        # Esto es para la subida real con JavaScript (fetch API)
        files = request.files.getlist('files[]')
        tags = request.form.getlist('tags[]') # Lista de tags
        
        metadata = load_metadata()
        
        newly_uploaded_files_info = []

        for i, file in enumerate(files):
            if file and allowed_file(file.filename):
                original_filename = secure_filename(file.filename)
                # Crear un nombre de archivo único para evitar sobrescrituras
                ext = original_filename.rsplit('.', 1)[1].lower()
                unique_filename = f"{uuid.uuid4().hex}.{ext}"
                
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(filepath)
                
                tag = tags[i] if i < len(tags) else "" # Asegurar que hay un tag
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                
                metadata.append({
                    'filename': unique_filename,
                    'original_filename': original_filename,
                    'tag': tag,
                    'timestamp': timestamp
                })
                newly_uploaded_files_info.append(unique_filename)
            else:
                # Podrías manejar errores aquí si un archivo no es válido
                print(f"Archivo no permitido o no presente: {file.filename if file else 'No file'}")

        save_metadata(metadata)
        # Devolver una respuesta JSON para el cliente JS
        return jsonify({"message": "Archivos subidos con éxito!", "uploaded_files": newly_uploaded_files_info}), 200
        
    return render_template('upload.html', active_tab='upload')



@app.route('/about')
def about_page():
    return render_template('about.html', active_tab='about')



@app.route('/gallery')
def gallery_page():
    metadata = load_metadata()
    # Ordenar por fecha de subida, más reciente primero
    sorted_metadata = sorted(metadata, key=lambda x: x['timestamp'], reverse=True)
    return render_template('gallery.html', images=sorted_metadata, active_tab='gallery')

@app.route('/IMAGENES/<filename>')
def serve_image(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')