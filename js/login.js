document.addEventListener('DOMContentLoaded', function() {



    //ESTA VUELTA ES PARA QUE AL DARLE PA TRAS EN EL NAVEGADOR Y HAY TOKEN LO MANDE AL DASHBOARD
    const token = localStorage.getItem('access_token');
    if (token) {
    // Opcional: verificar si el token sigue válido (con una llamada al backend)
    window.location.replace('dashboard.html'); // usa replace para que no pueda volver atrás al login
    }

    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('input_email');
    const passwordInput = document.getElementById('input_password');
    const togglePassword = document.getElementById('togglePassword');
    const loginButton = document.getElementById('loginButton');
    const buttonText = document.getElementById('buttonText');
    const buttonLoader = document.getElementById('buttonLoader');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const generalError = document.getElementById('generalError');
    const successMessage = document.getElementById('successMessage');
    const forgotPassword = document.getElementById('forgotPassword');
    
    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.querySelector('i').classList.toggle('fa-eye');
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });
    
    // Validate email
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // Validate password
    function validatePassword(password) {
        return password.length >= 6;
    }
    
    // Show error message
    function showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
        element.previousElementSibling.classList.add('error');
    }
    
    // Hide error message
    function hideError(element) {
        element.style.display = 'none';
        element.previousElementSibling.classList.remove('error');
        element.previousElementSibling.classList.remove('success');
    }
    
    // Show success message
    function showSuccess(element) {
        element.previousElementSibling.classList.add('success');
        element.previousElementSibling.classList.remove('error');
    }
    
    // Email validation on input
    emailInput.addEventListener('input', function() {
        if (validateEmail(this.value)) {
            hideError(emailError);
            showSuccess(emailError);
        } else if (this.value.length > 0) {
            showError(emailError, 'Por favor ingresa un correo válido');
        } else {
            hideError(emailError);
        }
    });
    
    // Password validation on input
    passwordInput.addEventListener('input', function() {
        if (validatePassword(this.value)) {
            hideError(passwordError);
            showSuccess(passwordError);
        } else if (this.value.length > 0) {
            showError(passwordError, 'La contraseña debe tener al menos 6 caracteres');
        } else {
            hideError(passwordError);
        }
    });
    
    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Reset messages
        hideError(emailError);
        hideError(passwordError);
        generalError.style.display = 'none';
        successMessage.style.display = 'none';
        
        // Validate form
        let isValid = true;
        
        if (!validateEmail(emailInput.value)) {
            showError(emailError, 'Por favor ingresa un correo válido');
            isValid = false;
        }
        
        if (!validatePassword(passwordInput.value)) {
            showError(passwordError, 'La contraseña debe tener al menos 6 caracteres');
            isValid = false;
        }
        
    });
    
    
    
    // Add shake animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);
    
    // Add focus animation to inputs
    const inputs = document.querySelectorAll('.form-control');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
            this.parentElement.style.transition = 'transform 0.3s ease';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
    });





});








const boton = document.getElementById("boton_login");

boton.addEventListener("click", (event)=>{
    event.preventDefault(); // Evita que el formulario se envíe de la forma tradicional
    // lo que que quiero que se ejecute cuando en el boton hagan click
    // URL del endpoint de autenticación en el servidor
    const loginUrl = "https://fastapi-final-4i0w.onrender.com/access/token";

    let correo = document.getElementById("input_email").value;
    let contrasenia = document.getElementById("input_password").value;

    // Crear objeto URLSearchParams para enviar datos como formulario
    const formData = new URLSearchParams();

    // Agregar credenciales al formulario
    formData.append("username", correo);  // Email del usuario
    formData.append("password", contrasenia); // Contraseña del usuario

    // Realizar petición HTTP POST al servidor
    fetch(loginUrl, {
        method: "POST",  // Método HTTP para enviar datos
        headers: {
            // Especifica que enviamos datos de formulario codificados en URL
            "Content-Type": "application/x-www-form-urlencoded",
            // Especifica que esperamos recibir JSON como respuesta
            "accept": "application/json"
        },
        body: formData  // Datos del formulario a enviar
    })
    .then(response => {
        // Verificar si la respuesta fue exitosa (status 200-299)
        if (!response.ok) {
            // Si hay error, convertir respuesta a JSON y lanzar excepción
            return response.json().then(err => { throw err });
        }
        // Si todo está bien, convertir respuesta a JSON
        return response.json();
    })
    .then(data => {
        // Manejar respuesta exitosa del servidor
        console.log("Login exitoso:", data);
        
        // Guardar token de acceso en localStorage del navegador
        localStorage.setItem("access_token", data.access_token);
        
        // Guardar información del usuario en localStorage (convertida a JSON)
        localStorage.setItem("user", JSON.stringify(data.user));

        // REDIRECCIÓN DESPUÉS DEL LOGIN EXITOSO
        // Opción 1: Redirección inmediata
        window.location.href = "dashboard.html";
        
        // Opción 2: Reemplazar la página actual (no permite volver atrás)
        // window.location.replace("dashboard.html");
    })
    // .catch(error => {
    //     // Manejar cualquier error que ocurra durante el proceso
    //     console.error("Error en login:", error);
    //     const mensaje = document.getElementById("error-mensaje");
    //     mensaje.style.display="block";
    //     mensaje.innerHTML = error.detail;
    // });
        .catch(error => {
            console.log("Estructura del error:", error);
            // Manejar cualquier error que ocurra durante el proceso
            console.error("Error en login:", error);
            const alerta = document.getElementById("alerta");
            // Usa error.detail si existe, de lo contrario un mensaje genérico
            alerta.textContent = error.detail || "Credenciales incorrectas o error en el servidor.";
            alerta.style.display = "block";
            
        });





});


    
    



