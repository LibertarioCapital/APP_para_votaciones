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
            if (previewContainer) previewContainer.innerHTML = '';
            filesToUpload = []; 
            
            const currentFiles = Array.from(event.target.files);

            currentFiles.forEach((file, index) => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    
                    const previewId = `preview-${Date.now()}-${index}`;

                    reader.onload = function(e) {
                        if (!previewContainer) return;

                        const previewItem = document.createElement('div');
                        previewItem.classList.add('preview-item');
                        previewItem.id = previewId;

                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.alt = `Previsualización de ${file.name}`;

                        const tagInput = document.createElement('input');
                        tagInput.type = 'text';
                        tagInput.placeholder = 'Tag opcional';
                        tagInput.setAttribute('aria-label', `Tag para ${file.name}`);


                        const deleteButton = document.createElement('button');
                        deleteButton.type = 'button';
                        deleteButton.classList.add('btn-delete-preview');
                        deleteButton.textContent = 'Eliminar';
                        deleteButton.setAttribute('aria-label', `Eliminar previsualización de ${file.name}`);
                        deleteButton.onclick = function() {
                            previewItem.remove();
                            filesToUpload = filesToUpload.filter(item => item.id !== previewId);
                            if (filesToUpload.length === 0) {
                                fileInput.value = ''; 
                            }
                        };

                        previewItem.appendChild(img);
                        previewItem.appendChild(tagInput);
                        previewItem.appendChild(deleteButton);
                        previewContainer.appendChild(previewItem);

                        filesToUpload.push({
                            id: previewId,
                            file: file,
                            tagElement: tagInput 
                        });
                    }
                    reader.readAsDataURL(file);
                } else {
                    console.warn(`Archivo no soportado: ${file.name}, tipo: ${file.type}`);
                    // Podrías mostrar un mensaje al usuario aquí
                }
            });
        });
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', async function(event) {
            event.preventDefault(); 
            
            if (filesToUpload.length === 0) {
                showUploadStatus('Por favor, seleccione al menos una imagen.', 'error');
                return;
            }

            const formData = new FormData();
            filesToUpload.forEach(item => {
                formData.append('files[]', item.file, item.file.name);
                formData.append('tags[]', item.tagElement.value);
            });
            
            showUploadStatus('Subiendo...', ''); 

            try {
                // Asegúrate de que la URL sea la correcta para tu entorno
                // Si Flask y el frontend están en diferentes puertos, usa la URL completa
                // ej: const UPLOAD_ENDPOINT = 'http://127.0.0.1:5000/upload';
                const UPLOAD_ENDPOINT = '/upload'; // Asume mismo origen
                
                const response = await fetch(UPLOAD_ENDPOINT, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) { // Verifica si la respuesta no fue exitosa (ej. 4xx, 5xx)
                    let errorMessage = `Error HTTP ${response.status}: ${response.statusText}`;
                    try {
                        const errorResult = await response.json(); // Intenta obtener un mensaje de error JSON del servidor
                        errorMessage = errorResult.message || errorMessage;
                    } catch (e) {
                        // Si el cuerpo de la respuesta no es JSON, usa el mensaje genérico
                    }
                    throw new Error(errorMessage);
                }
                
                const result = await response.json();

                showUploadStatus(result.message || 'Imágenes subidas con éxito.', 'success');
                if (previewContainer) previewContainer.innerHTML = '';
                filesToUpload = [];
                if (fileInput) fileInput.value = ''; 
                // Opcional: recargar la galería o redirigir
                // if (window.location.pathname.includes('/gallery')) {
                //     window.location.reload(); // Si ya está en la galería, recargarla
                // } else {
                //     // window.location.href = '/gallery'; // O redirigir a la galería
                // }

            } catch (error) {
                console.error('Error en la subida:', error);
                showUploadStatus(error.message || 'Error de conexión o del servidor.', 'error');
            }
        });
    }

    function showUploadStatus(message, type) {
        if (!uploadStatusDiv) return;
        uploadStatusDiv.textContent = message;
        uploadStatusDiv.className = 'upload-status'; 
        if (type) {
            uploadStatusDiv.classList.add(type); 
        }
        uploadStatusDiv.style.display = message ? 'block' : 'none'; // Mostrar u ocultar
    }


    // --- Lógica para Pestaña de Galería y Modal ---
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const captionText = document.getElementById("caption");
    const spanClose = modal ? modal.querySelector(".close-modal-btn") : null; // Búsqueda más específica
    const prevBtn = modal ? modal.querySelector(".prev-btn") : null;
    const nextBtn = modal ? modal.querySelector(".next-btn") : null;

    let galleryImagesData = []; 
    let currentImageIndex = -1;  

    // Solo ejecutar si estamos en una página con elementos de galería
    const galleryImageElements = document.querySelectorAll('.gallery-thumbnail, .gallery-image-large-trigger');
    
    if (galleryImageElements.length > 0 && modal) { // Asegurarse de que el modal existe
        galleryImageElements.forEach(imgEl => {
            galleryImagesData.push({
                src: imgEl.src, 
                originalFilename: imgEl.dataset.originalFilename || 'Imagen sin nombre',
                tag: imgEl.dataset.tag || '',
                timestamp: imgEl.dataset.timestamp || 'Fecha desconocida'
            });
        });

        function showImageInModal(index) {
            if (index < 0 || index >= galleryImagesData.length || !modalImg || !captionText) {
                console.warn("Índice inválido o elementos del modal no encontrados:", index, galleryImagesData.length);
                return;
            }
            currentImageIndex = index;
            const imageData = galleryImagesData[index];

            modalImg.src = imageData.src;
            modalImg.alt = imageData.originalFilename; // Añadir alt a la imagen del modal
            
            let captionContent = `<strong>${imageData.originalFilename}</strong>`;
            if (imageData.tag) captionContent += ` <br>Tag: ${imageData.tag}`;
            if (imageData.timestamp) captionContent += ` <br>Subido: ${imageData.timestamp}`;
            captionText.innerHTML = captionContent;

            modal.style.display = "block";

            if (prevBtn) prevBtn.style.display = (index > 0) ? "block" : "none";
            if (nextBtn) nextBtn.style.display = (index < galleryImagesData.length - 1) ? "block" : "none";
        }

        galleryImageElements.forEach((img) => {
            img.addEventListener('click', function() {
                const clickedImageSrc = this.src;
                const foundIndex = galleryImagesData.findIndex(item => item.src === clickedImageSrc);

                if (foundIndex !== -1) {
                    showImageInModal(foundIndex);
                } else {
                    console.warn("Imagen clickeada no encontrada en galleryImagesData:", clickedImageSrc);
                    // Fallback si es necesario (aunque no debería ocurrir si la recolección es correcta)
                    modal.style.display = "block";
                    modalImg.src = this.src;
                    modalImg.alt = this.dataset.originalFilename || 'Imagen';
                    let captionContent = `<strong>${this.dataset.originalFilename || 'Imagen'}</strong>`;
                    if (this.dataset.tag) captionContent += ` <br>Tag: ${this.dataset.tag}`;
                    if (this.dataset.timestamp) captionContent += ` <br>Subido: ${this.dataset.timestamp}`;
                    captionText.innerHTML = captionContent;
                    if (prevBtn) prevBtn.style.display = "none";
                    if (nextBtn) nextBtn.style.display = "none";
                }
            });
        });

        if (spanClose) {
            spanClose.onclick = function() {
                modal.style.display = "none";
            }
        }

        modal.addEventListener('click', function(event) {
            if (event.target === modal) { 
                modal.style.display = "none";
            }
        });
        
        document.addEventListener('keydown', function(event) {
            if (modal.style.display === "block") {
                if (event.key === "Escape") {
                    modal.style.display = "none";
                } else if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") { 
                    if (prevBtn && prevBtn.style.display !== "none") prevBtn.click(); // Simula clic en el botón
                } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
                    if (nextBtn && nextBtn.style.display !== "none") nextBtn.click(); // Simula clic en el botón
                }
            }
        });

        if (prevBtn) {
            prevBtn.onclick = function(e) {
                e.stopPropagation(); 
                if (currentImageIndex > 0) {
                    showImageInModal(currentImageIndex - 1);
                }
            }
        }

        if (nextBtn) {
            nextBtn.onclick = function(e) {
                e.stopPropagation(); 
                if (currentImageIndex < galleryImagesData.length - 1) {
                    showImageInModal(currentImageIndex + 1);
                }
            }
        }
    } // Fin del if (galleryImageElements.length > 0 && modal)

});