// ── FUNCIONES PARA EL FORMULARIO DE CAPTURA (Paso 2) ──

/**
 * Abre el modal de contacto capturando los datos actuales de la simulación
 */
function abrirFormularioCredito() {
    // 1. Obtener los valores actuales de los elementos del simulador
    const montoSimulado = document.getElementById('montoVal').textContent;
    const tipoSimulado = currentType; // Variable global ya existente en tu app.js

    // 2. Asignar los valores a los campos visibles y ocultos del modal
    const resumenMonto = document.getElementById('resumenMonto');
    const hiddenTipo = document.getElementById('form_tipo_credito');
    const hiddenValor = document.getElementById('form_valor_credito');
    const modal = document.getElementById('modalContacto');

    if (resumenMonto) resumenMonto.textContent = montoSimulado;
    if (hiddenTipo) hiddenTipo.value = tipoSimulado;
    if (hiddenValor) hiddenValor.value = montoSimulado;

    // 3. Mostrar el modal (usando flex para centrar)
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Procesa el envío del formulario del modal
 */
function enviarAFinal() {
    const nombre = document.getElementById('form_nombre').value;
    const documento = document.getElementById('form_documento').value;
    const telefono = document.getElementById('form_telefono').value;
    const tipo = document.getElementById('form_tipo_credito').value;
    const valor = document.getElementById('form_valor_credito').value;

    // Validación simple
    if (!nombre || !documento || !telefono) {
        alert("Por favor, completa todos los campos para continuar.");
        return;
    }

    // Cerramos el modal
    document.getElementById('modalContacto').style.display = 'none';

    // Ejecutamos el showToast original que ya tienes en tu app.js
    showToast('✅ ¡Gracias ' + nombre + '! Tu solicitud de ' + tipo + ' por ' + valor + ' ha sido enviada.');
    
    // Aquí quedará listo para el Paso 3 (Genesys Cloud)
    console.log("Datos listos para enviar a Genesys:", {
        nombre,
        documento,
        telefono,
        tipo,
        valor
    });
}
