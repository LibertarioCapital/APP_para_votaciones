document.addEventListener('DOMContentLoaded', function() {
    // --- Lógica para Pestaña de Subida ---
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const uploadForm = document.getElementById('uploadForm');
    const uploadStatusDiv = document.getElementById('uploadStatus');

    let filesToUpload = []; // Array para gestionar los archivos y sus datos

    if (fileInput) {
        fileInput.addEventListener('change', function(event) {
            // Limpiar previsualizaciones anteriores y lista de archivos si se seleccionan nuevos
            previewContainer.innerHTML = '';
            filesToUpload = []; 
            
            const currentFiles = Array.from(event.target.files);

            currentFiles.forEach((file, index) => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    
                    // Crear un ID único para este elemento de previsualización
                    const previewId = `preview-${Date.now()}-${index}`;

                    reader.onload = function(e) {
                        const previewItem = document.createElement('div');
                        previewItem.classList.add('preview-item');
                        previewItem.id = previewId;

                        const img = document.createElement('img');
                        img.src = e.target.result;

                        const tagInput = document.createElement('input');
                        tagInput.type = 'text';
                        tagInput.placeholder = 'Tag opcional';
                        // No se usa 'name' aquí, se leerá el valor al construir FormData

                        const deleteButton = document.createElement('button');
                        deleteButton.type = 'button'; // Importante para no enviar el form
                        deleteButton.classList.add('btn-delete-preview');
                        deleteButton.textContent = 'Eliminar';
                        deleteButton.onclick = function() {
                            // Eliminar de la UI
                            previewItem.remove();
                            // Eliminar de la lista de archivos a subir
                            filesToUpload = filesToUpload.filter(item => item.id !== previewId);
                            // Si no quedan archivos, resetear el input de archivos para que el usuario pueda
                            // volver a seleccionar los mismos si quiere (el evento 'change' no se dispararía)
                            if (filesToUpload.length === 0) {
                                fileInput.value = ''; // Resetea el file input
                            }
                        };

                        previewItem.appendChild(img);
                        previewItem.appendChild(tagInput);
                        previewItem.appendChild(deleteButton);
                        previewContainer.appendChild(previewItem);

                        // Guardar referencia al archivo y su tag input
                        filesToUpload.push({
                            id: previewId,
                            file: file,
                            tagElement: tagInput 
                        });
                    }
                    reader.readAsDataURL(file);
                }
            });
        });
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Evitar envío tradicional del formulario
            
            if (filesToUpload.length === 0) {
                showUploadStatus('Por favor, seleccione al menos una imagen.', 'error');
                return;
            }

            const formData = new FormData();
            filesToUpload.forEach(item => {
                formData.append('files[]', item.file, item.file.name); // El tercer argumento es el nombre del archivo
                formData.append('tags[]', item.tagElement.value);
            });
            
            showUploadStatus('Subiendo...', ''); // Mensaje neutral

            try {
                const response = await fetch("/upload", { // Usamos la misma ruta /upload para el POST
                    method: 'POST',
                    body: formData
                    // No necesitas 'Content-Type': 'multipart/form-data', 
                    // el navegador lo establece automáticamente para FormData
                });

                const result = await response.json();

                if (response.ok) {
                    showUploadStatus(result.message || 'Imágenes subidas con éxito.', 'success');
                    // Limpiar previsualizaciones y lista después de subir
                    previewContainer.innerHTML = '';
                    filesToUpload = [];
                    fileInput.value = ''; // Resetear el input de archivos
                    // Opcional: redirigir a la galería
                    // window.location.href = "{{ url_for('gallery_page') }}";
                } else {
                    showUploadStatus(result.message || 'Error al subir imágenes.', 'error');
                }
            } catch (error) {
                console.error('Error en la subida:', error);
                showUploadStatus('Error de conexión o del servidor.', 'error');
            }
        });
    }

    function showUploadStatus(message, type) {
        if (!uploadStatusDiv) return;
        uploadStatusDiv.textContent = message;
        uploadStatusDiv.className = 'upload-status'; // Reset class
        if (type) {
            uploadStatusDiv.classList.add(type); // 'success' o 'error'
        }
    }


    // --- Lógica para Pestaña de Galería y Modal ---
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const captionText = document.getElementById("caption");
    const spanClose = document.getElementsByClassName("close-modal-btn")[0];

    // Aplicar a todas las imágenes que deben abrir el modal
    document.querySelectorAll('.gallery-thumbnail, .gallery-image-large-trigger').forEach(img => {
        img.onclick = function(){
            if (modal && modalImg && captionText) {
                modal.style.display = "block";
                modalImg.src = this.src; // Usar la misma fuente que la miniatura/imagen clickeada
                
                let captionContent = `<strong>${this.dataset.originalFilename || 'Imagen'}</strong>`;
                if (this.dataset.tag) captionContent += ` <br>Tag: ${this.dataset.tag}`;
                if (this.dataset.timestamp) captionContent += ` <br>Subido: ${this.dataset.timestamp}`;
                captionText.innerHTML = captionContent;
            }
        }
    });

    if (spanClose) {
        spanClose.onclick = function() {
            if (modal) modal.style.display = "none";
        }
    }

    // Cerrar modal al hacer clic fuera de la imagen
    if (modal) {
        modal.onclick = function(event) {
            if (event.target === modal) { // Si el clic es en el fondo del modal
                modal.style.display = "none";
            }
        }
    }
    
    // Cerrar modal con tecla Esc
    document.addEventListener('keydown', function(event) {
        if (event.key === "Escape" && modal && modal.style.display === "block") {
            modal.style.display = "none";
        }
    });

});