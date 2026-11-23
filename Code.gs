/**
 * ============================================================================
 * SANT CRANES | Backend Google Apps Script (Web App API)
 * Conecta index.html (Cotizaciones) y checklist.html (Checklist FRC001)
 * con Google Sheets, Google Drive (Firmas PNG) y Gmail (Notificaciones).
 * ============================================================================
 * INSTRUCCIONES DE DESPLIEGUE:
 * 1. Abre Google Sheets y crea una hoja nueva llamada "SANT CRANES - Sistema Web".
 * 2. Ve a Extensiones > Apps Script y pega este código completo.
 * 3. Haz clic en Implementar > Nueva implementación > Aplicación web.
 * 4. Configura:
 *    - Ejecutar como: Yo (tu cuenta)
 *    - Quién tiene acceso: Cualquier persona
 * 5. Copia la URL /exec y pégala en la variable APPS_SCRIPT_URL de index.html y checklist.html.
 */

const CONFIG = {
  EMAIL_DESTINO: "santcranesventas@gmail.com", // Cambiar a ventas@tudominio.com cuando esté listo
  EMAIL_COPIA: "santcranes@gmail.com",
  CARPETA_DRIVE: "SANT_CRANES_Firmas_Reportes",
  HOJA_CHECKLIST: "Checklists_FRC001",
  HOJA_DETALLE: "Detalle_Inspeccion",
  HOJA_COTIZACIONES: "Cotizaciones_Web"
};

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "ok",
      service: "SANT CRANES API v1.0",
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const rawData = e.postData && e.postData.contents ? e.postData.contents : "{}";
    const payload = JSON.parse(rawData);
    const action = payload.action || "checklist";

    if (action === "cotizacion") {
      return handleCotizacion(payload);
    } else if (action === "checklist") {
      return handleChecklist(payload);
    } else {
      return jsonResponse({ status: "error", message: "Acción no reconocida: " + action });
    }
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function handleCotizacion(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.HOJA_COTIZACIONES);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.HOJA_COTIZACIONES);
    sheet.appendRow([
      "Folio", "Fecha Registro", "Nombre Contacto", "Empresa / Planta",
      "Teléfono / WhatsApp", "Correo Electrónico", "Servicio Requerido",
      "Equipo / Capacidad / Marca", "Descripción del Proyecto", "Estatus"
    ]);
    sheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#0B1B32").setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
  }

  const folio = "COT-" + Utilities.formatDate(new Date(), "America/Monterrey", "yyyyMMdd-HHmmss");
  const fecha = Utilities.formatDate(new Date(), "America/Monterrey", "dd/MM/yyyy HH:mm:ss");

  sheet.appendRow([
    folio,
    fecha,
    data.nombre || "",
    data.empresa || "",
    data.telefono || "",
    data.correo || "",
    data.servicio || "",
    data.equipo || "",
    data.mensaje || "",
    "Nuevo"
  ]);

  // Notificación por correo electrónico
  try {
    const subject = `[SANT CRANES Web] Nueva Cotización ${folio} - ${data.empresa || data.nombre}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #0B1B32; color: #FFFFFF; padding: 20px; border-bottom: 4px solid #EAB308;">
          <h2 style="margin: 0; color: #EAB308;">SANT CRANES</h2>
          <p style="margin: 4px 0 0; font-size: 13px;">Nueva Solicitud de Cotización desde Sitio Web</p>
        </div>
        <div style="padding: 20px; color: #1e293b;">
          <p><strong>Folio:</strong> ${folio}</p>
          <p><strong>Fecha:</strong> ${fecha}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0;">
          <p><strong>Contacto:</strong> ${data.nombre || "-"}</p>
          <p><strong>Empresa / Planta:</strong> ${data.empresa || "-"}</p>
          <p><strong>Teléfono / WhatsApp:</strong> ${data.telefono || "-"}</p>
          <p><strong>Correo:</strong> ${data.correo || "-"}</p>
          <p><strong>Servicio:</strong> ${data.servicio || "-"}</p>
          <p><strong>Equipo / Marca / Capacidad:</strong> ${data.equipo || "-"}</p>
          <p><strong>Detalle:</strong><br>${(data.mensaje || "").replace(/\n/g, "<br>")}</p>
        </div>
      </div>
    `;
    MailApp.sendEmail({
      to: CONFIG.EMAIL_DESTINO,
      cc: CONFIG.EMAIL_COPIA,
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (mailErr) {
    Logger.log("Aviso correo cotización: " + mailErr);
  }

  return jsonResponse({ status: "ok", folio: folio, message: "Cotización registrada correctamente." });
}

function handleChecklist(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const meta = data.meta || {};
  const stats = data.stats || {};
  const folio = meta.pedido || ("FRC-" + Utilities.formatDate(new Date(), "America/Monterrey", "yyyyMMdd-HHmmss"));
  const fechaRegistro = Utilities.formatDate(new Date(), "America/Monterrey", "dd/MM/yyyy HH:mm:ss");

  // Guardar firmas PNG en Google Drive si existen
  let urlFirmaTec = "";
  let urlFirmaCli = "";
  try {
    if (data.firmaTecnico && data.firmaTecnico.indexOf("data:image/png;base64,") === 0) {
      urlFirmaTec = saveBase64ImageToDrive(data.firmaTecnico, `${folio}_Firma_Tecnico.png`);
    }
    if (data.firmaCliente && data.firmaCliente.indexOf("data:image/png;base64,") === 0) {
      urlFirmaCli = saveBase64ImageToDrive(data.firmaCliente, `${folio}_Firma_Cliente.png`);
    }
  } catch (driveErr) {
    Logger.log("Error guardando firmas en Drive: " + driveErr);
  }

  // 1. Hoja Resumen de Checklists
  let sheetMain = ss.getSheetByName(CONFIG.HOJA_CHECKLIST);
  if (!sheetMain) {
    sheetMain = ss.insertSheet(CONFIG.HOJA_CHECKLIST);
    sheetMain.appendRow([
      "Folio / Pedido", "Fecha Registro", "Cliente", "Proyecto", "Grúa No. Serie",
      "Grúa No. Máquina", "Área", "Capacidad", "Tipo", "Dispositivo Bajo Gancho",
      "Técnico Responsable", "Periodo", "Fecha Entrega", "Fecha Mtto", "Estatus Servicio",
      "Total Puntos", "OK", "Preventivo/Obs", "Correctivo/Falla",
      "Refacciones Requeridas", "Notas Generales", "Firma Técnico (Drive)", "Firma Cliente (Drive)"
    ]);
    sheetMain.getRange(1, 1, 1, 23).setFontWeight("bold").setBackground("#0B1B32").setFontColor("#FFFFFF");
    sheetMain.setFrozenRows(1);
  }

  const refaccionesTexto = (data.spareParts || [])
    .map(p => `[${p.priority}] ${p.component} -> ${p.action}`)
    .join(" | ");

  sheetMain.appendRow([
    folio,
    fechaRegistro,
    meta.cliente || "",
    meta.proyecto || "",
    meta.serie || "",
    meta.maquina || "",
    meta.area || "",
    meta.capacidad || "",
    meta.tipo || "",
    meta.dispositivo || "",
    meta.tecnico || "",
    meta.periodo || "",
    meta.fechaEntrega || "",
    meta.fechaMtto || "",
    meta.estatus || "CONCLUIDO",
    stats.total || 0,
    stats.ok || 0,
    stats.prev || 0,
    stats.corr || 0,
    refaccionesTexto,
    meta.notasGenerales || "",
    urlFirmaTec,
    urlFirmaCli
  ]);

  // 2. Hoja Detalle por Punto Inspeccionado (solo puntos con actividad o hallazgos)
  let sheetDet = ss.getSheetByName(CONFIG.HOJA_DETALLE);
  if (!sheetDet) {
    sheetDet = ss.insertSheet(CONFIG.HOJA_DETALLE);
    sheetDet.appendRow([
      "Folio / Pedido", "Fecha Registro", "Cliente", "Grúa Serie",
      "Movimiento", "Subsistema", "Punto de Inspección", "Frecuencia",
      "Ene", "Feb", "Mzo", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
      "Acción Preventiva / Correctiva", "Original", "Max", "Min"
    ]);
    sheetDet.getRange(1, 1, 1, 24).setFontWeight("bold").setBackground("#1E293B").setFontColor("#EAB308");
    sheetDet.setFrozenRows(1);
  }

  const rowsToInsert = [];
  (data.items || []).forEach(it => {
    const months = it.months || {};
    const hasActivity = Object.values(months).some(v => v && v !== "") || it.action || it.orig || it.max || it.min;
    if (hasActivity) {
      rowsToInsert.push([
        folio, fechaRegistro, meta.cliente || "", meta.serie || "",
        it.block || "", it.sub || "", it.label || "", it.freq || "",
        months.Ene || "", months.Feb || "", months.Mzo || "", months.Abr || "",
        months.May || "", months.Jun || "", months.Jul || "", months.Ago || "",
        months.Sep || "", months.Oct || "", months.Nov || "", months.Dic || "",
        it.action || "", it.orig || "", it.max || "", it.min || ""
      ]);
    }
  });

  if (rowsToInsert.length > 0) {
    sheetDet.getRange(sheetDet.getLastRow() + 1, 1, rowsToInsert.length, 24).setValues(rowsToInsert);
  }

  // 3. Notificación por correo electrónico
  try {
    const subject = `[SANT CRANES FRC001] Reporte Mtto ${folio} - ${meta.cliente || "Planta"} (${meta.serie || "Equipo"})`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
        <div style="background: #0B1B32; color: #FFFFFF; padding: 20px; border-bottom: 4px solid #EAB308;">
          <h2 style="margin: 0; color: #EAB308;">SANT CRANES — Reporte FRC001</h2>
          <p style="margin: 4px 0 0; font-size: 13px;">Check List Digital de Mantenimiento Preventivo</p>
        </div>
        <div style="padding: 20px; color: #1e293b;">
          <p><strong>Pedido / Folio:</strong> ${folio} &nbsp;|&nbsp; <strong>Estatus:</strong> ${meta.estatus || "CONCLUIDO"}</p>
          <p><strong>Cliente:</strong> ${meta.cliente || "-"} &nbsp;|&nbsp; <strong>Área:</strong> ${meta.area || "-"}</p>
          <p><strong>Grúa Serie:</strong> ${meta.serie || "-"} &nbsp;|&nbsp; <strong>Capacidad:</strong> ${meta.capacidad || "-"} &nbsp;|&nbsp; <strong>Tipo:</strong> ${meta.tipo || "-"}</p>
          <p><strong>Técnico:</strong> ${meta.tecnico || "-"} &nbsp;|&nbsp; <strong>Fecha Mtto:</strong> ${meta.fechaMtto || "-"}</p>
          <div style="background: #f8fafc; padding: 12px; border-radius: 6px; margin: 14px 0; border-left: 4px solid #EAB308;">
            <strong>Resumen de Inspección:</strong><br>
            ✅ Puntos OK: <strong>${stats.ok || 0}</strong> &nbsp;|&nbsp;
            ⚠️ Preventivo/Obs: <strong>${stats.prev || 0}</strong> &nbsp;|&nbsp;
            ❌ Correctivo/Falla: <strong>${stats.corr || 0}</strong>
          </div>
          ${refaccionesTexto ? `<p><strong>Refacciones Requeridas:</strong><br>${refaccionesTexto}</p>` : ""}
          ${urlFirmaTec ? `<p><a href="${urlFirmaTec}">Ver Firma Técnico en Drive</a></p>` : ""}
          ${urlFirmaCli ? `<p><a href="${urlFirmaCli}">Ver Firma Cliente en Drive</a></p>` : ""}
        </div>
      </div>
    `;
    MailApp.sendEmail({
      to: CONFIG.EMAIL_DESTINO,
      cc: CONFIG.EMAIL_COPIA,
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (mailErr) {
    Logger.log("Aviso correo checklist: " + mailErr);
  }

  return jsonResponse({
    status: "ok",
    folio: folio,
    savedRows: rowsToInsert.length,
    message: "Checklist FRC001 guardado correctamente en Google Sheets y Drive."
  });
}

function saveBase64ImageToDrive(base64Data, fileName) {
  const folders = DriveApp.getFoldersByName(CONFIG.CARPETA_DRIVE);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.CARPETA_DRIVE);
  const raw = base64Data.split(",")[1];
  const decoded = Utilities.base64Decode(raw);
  const blob = Utilities.newBlob(decoded, "image/png", fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
