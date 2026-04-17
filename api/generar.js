// api/generar.js — Vercel Function
// Maneja generación de texto con Claude Y exportación a Word con tablas

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' });

  const { accion, prompt, maxTokens, datos } = req.body;

  // ── Acción: generar texto con Claude ──
  if (!accion || accion === 'generar') {
    if (!prompt) return res.status(400).json({ error: 'Falta el prompt' });
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: maxTokens || 1800, messages: [{ role: 'user', content: prompt }] })
      });
      if (!r.ok) { const e = await r.text(); return res.status(r.status).json({ error: `Error Anthropic: ${e}` }); }
      const data = await r.json();
      return res.status(200).json({ texto: data.content?.map(b => b.text || '').join('') || '' });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // ── Acción: exportar a Word ──
  if (accion === 'word') {
    try {
      const g = datos;
      const docxBuffer = generarDocx(g);
      const nombre = `Planeamiento_${g.asig}_${g.grado}_T${g.trim}.docx`.replace(/[°\s]/g, '');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
      return res.status(200).send(docxBuffer);
    } catch (e) { return res.status(500).json({ error: 'Error generando Word: ' + e.message }); }
  }

  return res.status(400).json({ error: 'Acción no reconocida' });
}

// ════════════════════════════════════════════════════════════
//  GENERADOR DE DOCX — Formato N°4 MEDUCA — Landscape
// ════════════════════════════════════════════════════════════
function generarDocx(g) {
  const esc = t => String(t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  // Colores
  const AZ = '1F3864', AZC = 'D6E4F0', GR = 'F2F2F2', BL = 'FFFFFF';

  // Página landscape: 15840 ancho x 12240 alto (en DXA)
  // Márgenes: 720 DXA (0.5 pulgada) = ancho disponible: 15840 - 1440 = 14400 DXA
  const W = 14400;

  function borde(color = AZ, sz = 6) {
    return `<w:top w:val="single" w:sz="${sz}" w:color="${color}"/>
            <w:bottom w:val="single" w:sz="${sz}" w:color="${color}"/>
            <w:left w:val="single" w:sz="${sz}" w:color="${color}"/>
            <w:right w:val="single" w:sz="${sz}" w:color="${color}"/>`;
  }

  function tcPr(w, fill = BL, span = 1, vAlign = 'center') {
    const sp = span > 1 ? `<w:gridSpan w:val="${span}"/>` : '';
    return `<w:tcPr>
      <w:tcW w:w="${w}" w:type="dxa"/>
      ${sp}
      <w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>
      <w:vAlign w:val="${vAlign}"/>
      <w:tcBorders>${borde()}</w:tcBorders>
      <w:tcMar>
        <w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/>
        <w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/>
      </w:tcMar>
    </w:tcPr>`;
  }

  function run(txt, bold = false, size = 16, color = '000000') {
    return `<w:r><w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
      ${bold ? '<w:b/><w:bCs/>' : ''}
      <w:sz w:val="${size}"/><w:szCs w:val="${size}"/>
      <w:color w:val="${color}"/>
    </w:rPr><w:t xml:space="preserve">${esc(txt)}</w:t></w:r>`;
  }

  function par(runs, center = false, spaceBefore = 0, spaceAfter = 60) {
    return `<w:p><w:pPr>
      ${center ? '<w:jc w:val="center"/>' : ''}
      <w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}"/>
    </w:pPr>${runs}</w:p>`;
  }

  function parTexto(txt, bold = false, size = 16, center = false, color = '000000') {
    // Dividir por saltos de línea
    const lineas = String(txt || '').split('\n');
    if (lineas.length === 1) return par(run(txt, bold, size, color), center);
    return lineas.map((l, i) => par(run(l, bold, size, color), center, 0, i < lineas.length - 1 ? 30 : 60)).join('');
  }

  function celda(contenido, anchoDxa, fill = BL, span = 1, vAlign = 'top') {
    return `<w:tc>${tcPr(anchoDxa, fill, span, vAlign)}${contenido}</w:tc>`;
  }

  function celdaH(txt, anchoDxa, span = 1) {
    return celda(par(run(txt, true, 17, BL), true), anchoDxa, AZ, span);
  }

  function celdaInfo(label, valor, anchoDxa) {
    return celda(par(run(label, true, 15) + run(valor, false, 15)), anchoDxa, AZC);
  }

  function fila(...celdas) { return `<w:tr>${celdas.join('')}</w:tr>`; }

  function tabla(filas, anchos) {
    const total = anchos.reduce((a, b) => a + b, 0);
    const grid = anchos.map(a => `<w:gridCol w:w="${a}"/>`).join('');
    return `<w:tbl>
      <w:tblPr>
        <w:tblW w:w="${total}" w:type="dxa"/>
        <w:tblLayout w:type="fixed"/>
        <w:tblBorders>${borde()}</w:tblBorders>
      </w:tblPr>
      <w:tblGrid>${grid}</w:tblGrid>
      ${filas.join('')}
    </w:tbl>`;
  }

  function parVacio() { return '<w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>'; }

  // ── Tabla encabezado institucional ──
  const tEncabezado = tabla([
    fila(celda(
      par(run('MINISTERIO DE EDUCACIÓN', true, 20, BL), true, 0, 20) +
      par(run(`DIRECCIÓN REGIONAL DE EDUCACIÓN DE ${g.regional.toUpperCase()}`, true, 17, BL), true, 0, 20) +
      par(run(`CENTRO EDUCATIVO ${g.centro.toUpperCase()}`, true, 17, BL), true, 0, 20) +
      par(run('SECUENCIA DIDÁCTICA SEMANAL O QUINCENAL DE EDUCACIÓN PRIMARIA, PREMEDIA Y MEDIA - UNIGRADO', true, 16, BL), true),
      W, AZ
    ))
  ], [W]);

  // ── Tabla datos informativos ──
  const w1 = Math.round(W * 0.25), w2 = Math.round(W * 0.15), w3 = Math.round(W * 0.15), w4 = Math.round(W * 0.45);
  const tDatos = tabla([
    fila(
      celdaInfo('ASIGNATURA: ', g.asig, w1),
      celdaInfo('HORAS SEMANALES: ', g.horas, w2),
      celdaInfo('GRADO: ', g.grado, w3),
      celdaInfo('DOCENTE(S): ', g.docente, w4)
    ),
    fila(
      celdaInfo('SEMANA: ', g.semana, w1 + w2 + w3),
      celdaInfo('TRIMESTRE: ', g.trim, w4)
    )
  ], [w1, w2, w3, w4]);

  // ── Tabla área ──
  const tArea = tabla([
    fila(celda(par(run('ÁREA: ' + (g.area || '_______________'), true, 16)), W, AZC))
  ], [W]);

  // ── Tabla competencias y objetivos ──
  const mitad = Math.round(W / 2);
  const tCompObj = tabla([
    fila(celdaH('COMPETENCIA(S) - Rasgo(s) de la competencia:', mitad), celdaH('OBJETIVO(S) DE APRENDIZAJE:', mitad)),
    fila(
      celda(parTexto(g.comp, false, 15), mitad, BL, 1, 'top'),
      celda(parTexto(g.objs, false, 15), mitad, BL, 1, 'top')
    )
  ], [mitad, mitad]);

  // ── Tabla contenidos e indicadores ──
  const tContInd = tabla([
    fila(celdaH('CONTENIDOS:', mitad), celdaH('INDICADOR(ES) DE LOGRO:', mitad)),
    fila(
      celda(
        parTexto('Conceptual:', true, 15) + parTexto(g.conc, false, 15) +
        parTexto('Procedimental:', true, 15) + parTexto(g.proc, false, 15) +
        parTexto('Actitudinal:', true, 15) + parTexto(g.acti, false, 15),
        mitad, BL, 1, 'top'
      ),
      celda(parTexto(g.ind, false, 15), mitad, BL, 1, 'top')
    )
  ], [mitad, mitad]);

  // ── Tabla actividades y evaluación ──
  const wAct = Math.round(W * 0.40);
  const wEvid = Math.round(W * 0.20);
  const wCrit = Math.round(W * 0.20);
  const wTipo = Math.round(W * 0.20);
  const tActEval = tabla([
    fila(celdaH('ACTIVIDADES', wAct), celdaH('EVALUACIÓN', wEvid + wCrit + wTipo, 3)),
    fila(
      celda('', wAct, AZC),
      celda(par(run('EVIDENCIAS', true, 15, AZ), true), wEvid, AZC),
      celda(par(run('CRITERIOS', true, 15, AZ), true), wCrit, AZC),
      celda(par(run('TIPO DE EVALUACIÓN / INSTRUMENTOS', true, 15, AZ), true), wTipo, AZC)
    ),
    fila(
      celda(
        parTexto('Actividad(es) de inicio:', true, 15) + parTexto(g.ini, false, 15) +
        parTexto('Actividad(es) de desarrollo:', true, 15) + parTexto(g.des, false, 15) +
        parTexto('Actividad(es) de cierre:', true, 15) + parTexto(g.cie, false, 15),
        wAct, BL, 1, 'top'
      ),
      celda(
        parTexto('Entregables:', true, 14) + parTexto(g.evidEnt, false, 14) +
        parTexto('Actuaciones directas:', true, 14) + parTexto(g.evidAct, false, 14),
        wEvid, BL, 1, 'top'
      ),
      celda(parTexto(g.crit, false, 14), wCrit, BL, 1, 'top'),
      celda(
        parTexto('Diagnóstica:', true, 14) + parTexto(g.ed, false, 14) +
        parTexto('Formativa:', true, 14) + parTexto(g.ef, false, 14) +
        parTexto('Sumativa:', true, 14) + parTexto(g.es, false, 14),
        wTipo, BL, 1, 'top'
      )
    )
  ], [wAct, wEvid, wCrit, wTipo]);

  // ── Instrumentos de evaluación ──
  const tInstrH = tabla([
    fila(celdaH('INSTRUMENTOS DE EVALUACIÓN', W))
  ], [W]);

  // Lista de cotejo
  const wIC1 = Math.round(W * 0.6), wIC2 = Math.round(W * 0.2), wIC3 = W - wIC1 - wIC2;
  const filasLista = parsearTablaMarkdown(g.instrLista || '');
  const tLista = filasLista.length > 0 ? tabla([
    fila(celdaH('Lista de cotejo / Escala de valoración', W, 3)),
    fila(celdaH('Criterio', wIC1), celdaH('Sí', wIC2), celdaH('No', wIC3)),
    ...filasLista.map(cols => fila(
      celda(parTexto(cols[0] || '', false, 14), wIC1),
      celda(parTexto(cols[1] || '', false, 14), wIC2, GR),
      celda(parTexto(cols[2] || '', false, 14), wIC3, GR)
    ))
  ], [wIC1, wIC2, wIC3]) : '';

  // Rúbrica
  const wR1 = Math.round(W * 0.28), wR2 = Math.round(W * 0.24), wR3 = Math.round(W * 0.24), wR4 = W - wR1 - wR2 - wR3;
  const filasRubrica = parsearTablaMarkdown(g.instrRubrica || '');
  const tRubrica = filasRubrica.length > 0 ? tabla([
    fila(celdaH('Rúbrica analítica', W, 4)),
    fila(celdaH('Criterio', wR1), celdaH('Logrado', wR2), celdaH('En proceso', wR3), celdaH('Iniciado', wR4)),
    ...filasRubrica.map(cols => fila(
      celda(parTexto(cols[0] || '', true, 14), wR1),
      celda(parTexto(cols[1] || '', false, 14), wR2),
      celda(parTexto(cols[2] || '', false, 14), wR3),
      celda(parTexto(cols[3] || '', false, 14), wR4)
    ))
  ], [wR1, wR2, wR3, wR4]) : '';

  // Registro anecdótico
  const wReg1 = Math.round(W * 0.15), wReg2 = Math.round(W * 0.30), wReg3 = Math.round(W * 0.30), wReg4 = W - wReg1 - wReg2 - wReg3;
  const tRegistro = tabla([
    fila(celdaH('Registro anecdótico', W, 4)),
    fila(celdaH('Fecha', wReg1), celdaH('Observaciones (Esmero y disposición)', wReg2), celdaH('Interpretación (Nivel de compromiso)', wReg3), celdaH('Recomendaciones', wReg4)),
    fila(
      celda(parVacio() + parVacio(), wReg1, GR),
      celda(parVacio() + parVacio(), wReg2, GR),
      celda(parVacio() + parVacio(), wReg3, GR),
      celda(parVacio() + parVacio(), wReg4, GR)
    ),
    fila(
      celda(parVacio() + parVacio(), wReg1),
      celda(parVacio() + parVacio(), wReg2),
      celda(parVacio() + parVacio(), wReg3),
      celda(parVacio() + parVacio(), wReg4)
    ),
    fila(
      celda(parVacio() + parVacio(), wReg1, GR),
      celda(parVacio() + parVacio(), wReg2, GR),
      celda(parVacio() + parVacio(), wReg3, GR),
      celda(parVacio() + parVacio(), wReg4, GR)
    )
  ], [wReg1, wReg2, wReg3, wReg4]);

  // ── Observaciones y firmas ──
  const tObsFirmas = tabla([
    fila(celda(par(run('Observaciones: ', true, 15) + run('_______________________________________________', false, 15)), W, GR))
  ], [W]);

  const wF1 = Math.round(W / 2), wF2 = W - wF1;
  const tFirmas = tabla([
    fila(
      celda(par(run('Firma del (los) docentes', true, 15)) + par(run('_'.repeat(40), false, 15)), wF1),
      celda(par(run('Firma del Coordinador o Subdirector Técnico Docente', true, 15)) + par(run('_'.repeat(40), false, 15)), wF2)
    )
  ], [wF1, wF2]);

  // ── Planes diarios ──
  let planesXml = '';
  if (g.planes) {
    planesXml = `
      ${parVacio()}
      ${tabla([fila(celdaH('PLANES DIARIOS DETALLADOS', W))], [W])}
      ${parVacio()}
      ${parTexto(g.planes, false, 15)}
    `;
  }

  // ── XML del documento completo ──
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  mc:Ignorable="">
<w:body>
  <w:sectPr>
    <w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>
    <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/>
  </w:sectPr>
  ${tEncabezado}${parVacio()}
  ${tDatos}${parVacio()}
  ${tArea}
  ${tCompObj}
  ${tContInd}${parVacio()}
  ${tActEval}${parVacio()}
  ${tInstrH}${parVacio()}
  ${tLista ? tLista + parVacio() : ''}
  ${tRubrica ? tRubrica + parVacio() : ''}
  ${tRegistro}${parVacio()}
  ${tObsFirmas}${parVacio()}
  ${tFirmas}
  ${planesXml}
</w:body>
</w:document>`;

  return crearZip(docXml);
}

// ── Parser de tablas Markdown ──
function parsearTablaMarkdown(txt) {
  const lineas = txt.split('\n').filter(l => l.includes('|'));
  const filas = [];
  for (const linea of lineas) {
    if (linea.match(/^\s*\|[-:\s|]+\|\s*$/)) continue; // separador
    const cols = linea.split('|').filter((_, i, a) => i > 0 && i < a.length - 1).map(c => c.trim());
    if (cols.length > 0) filas.push(cols);
  }
  return filas.slice(0); // incluye encabezado — lo saltamos en el llamador
}

// ════════════════════════════════════════════════════════════
//  CREADOR DE ZIP/DOCX sin dependencias externas
// ════════════════════════════════════════════════════════════
function crearZip(documentXml) {
  const archivos = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    'word/document.xml': documentXml,
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`
  };

  const partes = [];
  const dirCentral = [];
  let offset = 0;

  for (const [nombre, contenido] of Object.entries(archivos)) {
    const nombreBytes = Buffer.from(nombre, 'utf-8');
    const datos = Buffer.from(contenido, 'utf-8');
    const crc = calcCRC32(datos);
    const ahora = new Date();
    const dosDate = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();
    const dosTime = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1);

    const localHeader = Buffer.alloc(30 + nombreBytes.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc >>> 0, 14);
    localHeader.writeUInt32LE(datos.length, 18);
    localHeader.writeUInt32LE(datos.length, 22);
    localHeader.writeUInt16LE(nombreBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nombreBytes.copy(localHeader, 30);
    partes.push(localHeader, datos);

    const cdEntry = Buffer.alloc(46 + nombreBytes.length);
    cdEntry.writeUInt32LE(0x02014b50, 0);
    cdEntry.writeUInt16LE(20, 4); cdEntry.writeUInt16LE(20, 6);
    cdEntry.writeUInt16LE(0, 8); cdEntry.writeUInt16LE(0, 10);
    cdEntry.writeUInt16LE(dosTime, 12); cdEntry.writeUInt16LE(dosDate, 14);
    cdEntry.writeUInt32LE(crc >>> 0, 16);
    cdEntry.writeUInt32LE(datos.length, 20); cdEntry.writeUInt32LE(datos.length, 24);
    cdEntry.writeUInt16LE(nombreBytes.length, 28);
    cdEntry.writeUInt16LE(0, 30); cdEntry.writeUInt16LE(0, 32);
    cdEntry.writeUInt16LE(0, 34); cdEntry.writeUInt16LE(0, 36);
    cdEntry.writeUInt32LE(0, 38); cdEntry.writeUInt32LE(offset, 42);
    nombreBytes.copy(cdEntry, 46);
    dirCentral.push(cdEntry);
    offset += localHeader.length + datos.length;
  }

  const cdBuffer = Buffer.concat(dirCentral);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(Object.keys(archivos).length, 8);
  eocd.writeUInt16LE(Object.keys(archivos).length, 10);
  eocd.writeUInt32LE(cdBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...partes, cdBuffer, eocd]);
}

function calcCRC32(buf) {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
