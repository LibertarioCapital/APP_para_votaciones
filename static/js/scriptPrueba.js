document.addEventListener('DOMContentLoaded', function() {
    // ... (código existente de la pestaña de subida) ...
    // showUploadStatus function ...

    // --- Lógica para Pestaña de Galería y Modal ---
    const modal = document.getElementById("imageModal");
    const modalImg = modal ? modal.querySelector("#modalImage") : null;
    const captionText = modal ? modal.querySelector("#caption") : null;
    const spanClose = modal ? modal.querySelector(".close-modal-btn") : null;
    const prevBtn = modal ? modal.querySelector(".prev-btn") : null;
    const nextBtn = modal ? modal.querySelector(".next-btn") : null;

    let galleryImagesData = []; 
    let currentImageIndex = -1;  

    // Modal de confirmación de eliminación
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const deleteConfirmFilenameSpan = document.getElementById('deleteConfirmFilename');
    let fileToDelete = null; // Para guardar el nombre del archivo a eliminar

    function initializeGalleryData() {
        galleryImagesData = []; // Resetear
        const galleryImageElements = document.querySelectorAll('.gallery-item .gallery-image-large-trigger, .gallery-reel .gallery-thumbnail');
        
        galleryImageElements.forEach(imgEl => {
            const parentItem = imgEl.closest('.gallery-item') || imgEl.closest('.gallery-thumbnail-container');
            if (parentItem && parentItem.dataset.filename) { // Asegurarse de que tiene el filename
                galleryImagesData.push({
                    src: imgEl.src, 
                    filename: parentItem.dataset.filename, // Usar el filename del contenedor padre
                    originalFilename: imgEl.dataset.originalFilename || 'Imagen sin nombre',
                    tag: imgEl.dataset.tag || '',
                    timestamp: imgEl.dataset.timestamp || 'Fecha desconocida',
                    elementRef: parentItem // Referencia al elemento DOM del item para eliminarlo de la UI
                });
            }
        });
    }


    function showImageInModal(index) {
        if (!modal || !modalImg || !captionText) return; // Salir si el modal no está disponible
        if (index < 0 || index >= galleryImagesData.length) {
            console.warn("Índice para modal fuera de rango o galería vacía:", index, galleryImagesData.length);
            if (galleryImagesData.length === 0) modal.style.display = "none"; // Ocultar modal si no hay imágenes
            return;
        }
        currentImageIndex = index;
        const imageData = galleryImagesData[index];

        modalImg.src = imageData.src;
        modalImg.alt = imageData.originalFilename;
        
        let captionContent = `<strong>${imageData.originalFilename}</strong> (${imageData.filename})`; // Mostrar también unique filename
        if (imageData.tag) captionContent += ` <br>Tag: ${imageData.tag}`;
        if (imageData.timestamp) captionContent += ` <br>Subido: ${imageData.timestamp}`;
        captionText.innerHTML = captionContent;

        modal.style.display = "block";

        if (prevBtn) prevBtn.style.display = (index > 0) ? "block" : "none";
        if (nextBtn) nextBtn.style.display = (index < galleryImagesData.length - 1) ? "block" : "none";
    }

    function setupGalleryInteractions() {
        const galleryImageTriggers = document.querySelectorAll('.gallery-image-large-trigger, .gallery-thumbnail');
        galleryImageTriggers.forEach((img) => {
            img.addEventListener('click', function() {
                const parentItem = this.closest('.gallery-item') || this.closest('.gallery-thumbnail-container');
                if (!parentItem || !parentItem.dataset.filename) return;

                const clickedImageFilename = parentItem.dataset.filename;
                const foundIndex = galleryImagesData.findIndex(item => item.filename === clickedImageFilename);

                if (foundIndex !== -1) {
                    showImageInModal(foundIndex);
                } else {
                    console.warn("Imagen clickeada no encontrada en galleryImagesData:", clickedImageFilename);
                }
            });
        });

        // --- Lógica de Eliminación ---
        document.querySelectorAll('.btn-delete-gallery-item').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation(); // Evitar que se abra el modal si el botón está sobre la imagen
                fileToDelete = this.dataset.filename;
                const originalFilename = this.closest('.gallery-item')?.querySelector('.gallery-image-large-trigger')?.dataset.originalFilename || 
                                         this.closest('.gallery-thumbnail-container')?.querySelector('.gallery-thumbnail')?.dataset.originalFilename || 
                                         fileToDelete;

                if (deleteConfirmModal && deleteConfirmFilenameSpan) {
                    deleteConfirmFilenameSpan.textContent = originalFilename;
                    deleteConfirmModal.style.display = 'block';
                } else {
                    // Fallback a window.confirm si el modal no está definido
                    if (window.confirm(`¿Estás seguro de que quieres eliminar la imagen "${originalFilename}"?`)) {
                        performDelete(fileToDelete);
                    }
                }
            });
        });
    }
    
    async function performDelete(filename) {
        if (!filename) return;
        
        // Mostrar algún indicador de carga si se desea
        showUploadStatus(`Eliminando ${filename}...`, ''); // Reusar showUploadStatus o crear uno nuevo

        try {
            const response = await fetch(`/delete_image/${filename}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (response.ok) {
                showUploadStatus(result.message || 'Imagen eliminada con éxito.', 'success');
                
                // Eliminar de la UI
                const itemToRemove = document.querySelector(`.gallery-item[data-filename="${filename}"]`);
                if (itemToRemove) itemToRemove.remove();
                const thumbnailToRemove = document.querySelector(`.gallery-thumbnail-container[data-filename="${filename}"]`);
                if (thumbnailToRemove) thumbnailToRemove.remove();

                // Actualizar galleryImagesData
                const deletedImageIndexInArray = galleryImagesData.findIndex(img => img.filename === filename);
                if (deletedImageIndexInArray > -1) {
                    galleryImagesData.splice(deletedImageIndexInArray, 1);
                }

                // Si la imagen eliminada estaba en el modal
                if (modal && modal.style.display === 'block' && currentImageIndex === deletedImageIndexInArray) {
                    if (galleryImagesData.length > 0) {
                        // Mostrar la anterior o la primera si se eliminó la primera
                        const newIndexToShow = Math.max(0, currentImageIndex -1);
                         if (currentImageIndex >= galleryImagesData.length) { // Si se eliminó la última
                            showImageInModal(galleryImagesData.length -1);
                        } else {
                            showImageInModal(currentImageIndex); // El índice se actualiza porque el array se acortó
                        }
                    } else {
                        modal.style.display = 'none'; // Cerrar modal si no quedan imágenes
                    }
                } else if (modal && modal.style.display === 'block' && currentImageIndex > deletedImageIndexInArray) {
                    // Si se eliminó una imagen antes de la actual en el modal, ajustar el índice
                    currentImageIndex--; 
                    // No es necesario llamar a showImageInModal aquí a menos que quieras forzar un refresh
                }

                // Verificar si la galería está vacía
                if (document.querySelectorAll('.gallery-item').length === 0) {
                    const galleryGrid = document.querySelector('.gallery-grid');
                    if (galleryGrid) galleryGrid.innerHTML = '<p>No hay imágenes en la galería. ¡Sube algunas!</p>';
                    const galleryReel = document.querySelector('.gallery-reel');
                     if (galleryReel) galleryReel.innerHTML = ''; // Limpiar reel también
                }

            } else {
                showUploadStatus(result.message || 'Error al eliminar la imagen.', 'error');
            }
        } catch (error) {
            console.error('Error en la eliminación:', error);
            showUploadStatus('Error de conexión o del servidor al eliminar.', 'error');
        } finally {
            if (deleteConfirmModal) deleteConfirmModal.style.display = 'none';
            fileToDelete = null;
        }
    }

    // Eventos del Modal de Confirmación de Eliminación
    if (confirmDeleteBtn && cancelDeleteBtn && deleteConfirmModal) {
        confirmDeleteBtn.onclick = function() {
            performDelete(fileToDelete);
        };
        cancelDeleteBtn.onclick = function() {
            deleteConfirmModal.style.display = 'none';
            fileToDelete = null;
        };
        // Cerrar modal de confirmación si se hace clic fuera
        deleteConfirmModal.onclick = function(event) {
            if (event.target === deleteConfirmModal) {
                deleteConfirmModal.style.display = 'none';
                fileToDelete = null;
            }
        };
    }


    // --- Inicialización y Event Listeners Generales del Modal ---
    if (modal) { // Solo si el modal principal existe
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
                    if (prevBtn && prevBtn.style.display !== "none") prevBtn.click();
                } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
                    if (nextBtn && nextBtn.style.display !== "none") nextBtn.click();
                }
            } else if (deleteConfirmModal && deleteConfirmModal.style.display === 'block' && event.key === "Escape") {
                // Cerrar modal de confirmación con Escape
                deleteConfirmModal.style.display = 'none';
                fileToDelete = null;
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
    }
    
    // Inicializar datos y listeners de la galería
    // Asegurarse de que esto se llama cuando la galería está presente.
    // Si la galería se carga dinámicamente, esto necesitaría re-ejecutarse.
    if (document.querySelector('.gallery-grid') || document.querySelector('.gallery-reel')) {
        initializeGalleryData();
        setupGalleryInteractions();
    }

});