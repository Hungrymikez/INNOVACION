// SELECCIONAMOS EL BOTÓN DE LOGOUT POR SU ID
const logoutButton = document.getElementById('logout_boton');

/**
 * Llamamos LA FUNCIÓN PARA MANEJAR EL LOGOUT
 * Limpia los datos de sesión y redirige al login.
 */
if (logoutButton) {
  logoutButton.addEventListener('click', (event) => {
    event.preventDefault();
    console.log('Cerrando sesión...');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
  });
};



document.addEventListener("DOMContentLoaded", function(){


  console.log("El documento HTML HA SIDO CARGADO");
  const token = localStorage.getItem('access_token');
  if (!token){
    window.location.href = '/index.html';
    return;
    // window.location.replace('index.html');  ESTE ES PARA QUE SE LE BLOQUEE LAS FLECHAS DE DEVOLVER EN EL NAVEGADOR
  }else{
        //   document.body.classList.add('authenticated');
        document.getElementById('protegido').style.display = 'block';

  };




  //LOGICA DEL PROYECTO

  

  //INICIACION DE LOS MODALES

    // document.getElementById('subirBtn').addEventListener('click', function() {
    //     const modal = new bootstrap.Modal(document.getElementById('subirModal'));
    //     modal.show();
    // });


    //     // File select button
    // document.getElementById('selectFileBtn').addEventListener('click', function() {
    //     document.getElementById('fileInput').click();
    // });

    // // File input change
    // document.getElementById('fileInput').addEventListener('change', function(e) {
    //     if (e.target.files.length > 0) {
    //         const fileName = e.target.files[0].name;
    //         document.getElementById('fileNameDisplay').innerHTML = 
    //             `<div class="alert alert-success mb-0"><i class="fas fa-check-circle me-2"></i> ${fileName}</div>`;
    //     }
    // });



    //     // Drag & drop
    // document.getElementById('dropZone').addEventListener('dragover', function(e) {
    //     e.preventDefault();
    //     this.classList.add('border-primary');
    //     this.classList.remove('border-dashed');
    // });
    // document.getElementById('dropZone').addEventListener('dragleave', function() {
    //     this.classList.remove('border-primary');
    //     this.classList.add('border-dashed');
    // });
    // document.getElementById('dropZone').addEventListener('drop', function(e) {
    //     e.preventDefault();
    //     this.classList.remove('border-primary');
    //     this.classList.add('border-dashed');
    //     if (e.dataTransfer.files.length > 0) {
    //         const file = e.dataTransfer.files[0];
    //         document.getElementById('fileInput').files = e.dataTransfer.files;
    //         document.getElementById('fileNameDisplay').innerHTML = 
    //             `<div class="alert alert-success mb-0"><i class="fas fa-check-circle me-2"></i> ${file.name}</div>`;
    //     }
    // });



        // Upload submit
      // Upload submit
    // document.getElementById('uploadForm').addEventListener('submit', async function(e) {
    //     e.preventDefault();
    //     const fileInput = document.getElementById('fileInput');
    //     const projectSelect = document.getElementById('projectSelect');
    //     const reportDate = document.getElementById('reportDate');
    //     const sgpsCode = document.getElementById('sgpsCode');
    //     const studyCenterName = document.getElementById('studyCenterName');
    //     const regional = document.getElementById('regional');
    //     const projectResponsibles = document.getElementById('projectResponsibles');
    //     const responsible = document.getElementById('responsible');
    //     const progress = document.getElementById('progress');
    //     const observations = document.getElementById('observations');

    //     if (!fileInput.files.length || !projectSelect.value || !reportDate.value || !responsible.value || !progress.value) {
    //         alert('Por favor complete todos los campos requeridos');
    //         return;
    //     }

    //     document.getElementById('uploadText').classList.add('d-none');
    //     document.getElementById('uploadSpinner').classList.remove('d-none');

    //     try {
    //         const formData = new FormData();
    //         formData.append('file', fileInput.files[0]);
    //         formData.append('projectId', projectSelect.value);
    //         formData.append('reportDate', reportDate.value);
    //         formData.append('sgpsCode', sgpsCode.value);
    //         formData.append('studyCenterName', studyCenterName.value);
    //         formData.append('regional', regional.value);
    //         formData.append('projectResponsibles', projectResponsibles.value);
    //         formData.append('responsible', responsible.value);
    //         formData.append('progress', progress.value);
    //         formData.append('observations', observations.value);

    //         const resp = await fetch(`${API_BASE}/api/files/upload`, {
    //             method: 'POST',
    //             body: formData
    //         });

    //         if (!resp.ok) throw new Error('Error subiendo archivo');

    //         const data = await resp.json();
    //         alert('Archivo subido correctamente');
    //         location.reload();

    //     } catch (err) {
    //         console.error(err);
    //         alert('Error al subir el archivo');
    //     } finally {
    //         document.getElementById('uploadText').classList.remove('d-none');
    //         document.getElementById('uploadSpinner').classList.add('d-none');
    //     }
    // });































});




