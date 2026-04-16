package com.kyntus.Workflow.service;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.*;
import java.util.stream.Stream;

@Service
public class ParametrageMasterService {

    private final InstParametrageService instService;
    private final MesParametrageService mesService;
    private final MatParametrageService matService;
    private final LogistiqueParametrageService logService;
    private final SupportParametrageService supportService;

    public ParametrageMasterService(
            InstParametrageService instService,
            MesParametrageService mesService,
            MatParametrageService matService,
            LogistiqueParametrageService logService,
            SupportParametrageService supportService) {
        this.instService = instService;
        this.mesService = mesService;
        this.matService = matService;
        this.logService = logService;
        this.supportService = supportService;
    }

    private double parseDoubleSafe(String val) {
        if (val == null || val.trim().isEmpty()) return 0.0;
        try { return Double.parseDouble(val.trim().replace(",", ".")); } catch (Exception e) { return 0.0; }
    }

    private boolean parseBoolSafe(String val) {
        if (val == null || val.trim().isEmpty()) return false;
        String v = val.trim().toLowerCase();
        return v.equals("true") || v.equals("vrai") || v.equals("1");
    }

    private int parseIntSafe(String val) {
        if (val == null || val.trim().isEmpty()) return 0;
        try { return (int) Double.parseDouble(val.trim().replace(",", ".")); } catch (Exception e) { return 0; }
    }

    public byte[] processParametrageFile(MultipartFile file) throws Exception {

        try (InputStream inputStream = file.getInputStream();
             ReadableWorkbook wbReader = new ReadableWorkbook(inputStream);
             XSSFWorkbook wbWriter = new XSSFWorkbook()) {

            Sheet outputSheet = wbWriter.createSheet("Resultat_Parametrage");

            org.dhatim.fastexcel.reader.Sheet inputSheet = wbReader.getFirstSheet();
            try (Stream<org.dhatim.fastexcel.reader.Row> rowStream = inputSheet.openStream()) {
                Iterator<org.dhatim.fastexcel.reader.Row> rowIterator = rowStream.iterator();

                if (!rowIterator.hasNext()) {
                    throw new RuntimeException("Le fichier est vide.");
                }

                org.dhatim.fastexcel.reader.Row headerRowReader = rowIterator.next();
                Row headerRowWriter = outputSheet.createRow(0);

                List<String> headers = new ArrayList<>();
                List<String> normalizedHeaders = new ArrayList<>(); // 🔥 SYSTEME ANTI-CASSE DES COLONNES 🔥

                for (int i = 0; i < headerRowReader.getCellCount(); i++) {
                    String colName = headerRowReader.getCellText(i);
                    if (colName != null) {
                        String cleanName = colName.trim();
                        headers.add(cleanName);
                        // Convertit "Type Installation" ola "type_installation" l -> "typeinstallation"
                        normalizedHeaders.add(cleanName.toLowerCase().replaceAll("[\\s_'-]", ""));
                        headerRowWriter.createCell(i).setCellValue(cleanName);
                    } else {
                        headers.add("");
                        normalizedHeaders.add("");
                    }
                }

                int outputRowNum = 1;

                while (rowIterator.hasNext()) {
                    org.dhatim.fastexcel.reader.Row rowReader = rowIterator.next();
                    Row rowWriter = outputSheet.createRow(outputRowNum++);

                    Map<String, String> currentRowData = new HashMap<>();
                    for (int i = 0; i < headers.size(); i++) {
                        String cellValue = (i < rowReader.getCellCount()) ? rowReader.getCellText(i) : "";
                        // On stocke la donnée avec la clé NORMALISÉE (minuscule sans espace)
                        currentRowData.put(normalizedHeaders.get(i), cellValue != null ? cellValue.trim() : "");
                    }

                    String action = currentRowData.getOrDefault("action", currentRowData.getOrDefault("statut", ""));

                    // --- EXTRACTION INST ---
                    // On cherche "inst" wla "mt" f cas où tbedlat smia
                    String instStr = currentRowData.get("inst");
                    if (instStr == null || instStr.isEmpty()) instStr = currentRowData.get("mt");
                    double instPrice = parseDoubleSafe(instStr);

                    String typeInst = currentRowData.getOrDefault("typeinstallation", "");
                    boolean curZoneComplexe = parseBoolSafe(currentRowData.get("estzonecomplexe"));
                    boolean curPreAppel = parseBoolSafe(currentRowData.get("estpreappel"));

                    // --- EXTRACTION MES ---
                    double mesPrice = parseDoubleSafe(currentRowData.get("mes"));
                    boolean curInt = parseBoolSafe(currentRowData.get("estdiagnosticinternet"));
                    boolean curTel = parseBoolSafe(currentRowData.get("estdiagnostictelephone"));
                    boolean curTv = parseBoolSafe(currentRowData.get("estdiagnostictv"));
                    boolean curMes = parseBoolSafe(currentRowData.get("estmiseenservice"));
                    boolean curBranch = parseBoolSafe(currentRowData.get("estbranchement"));
                    boolean curWifi = parseBoolSafe(currentRowData.get("estdiagnosticwifi"));

                    // --- EXTRACTION MATERIEL ---
                    double matPrice = parseDoubleSafe(currentRowData.get("materiel"));
                    boolean curFournisseur = parseBoolSafe(currentRowData.get("estfournisseurbytel"));

                    // --- EXTRACTION LOGISTIQUE ---
                    double logPrice = parseDoubleSafe(currentRowData.get("logistique"));
                    int curRepeteurs = parseIntSafe(currentRowData.get("nombrerepeteursposes"));

                    // --- EXTRACTION SUPPORT ---
                    double supPrice = parseDoubleSafe(currentRowData.get("support"));
                    double curDevis = parseDoubleSafe(currentRowData.get("montantdevis"));

                    // 🚀 EXECUTION DES MOTEURS METIERS 🚀
                    Map<String, Object> globalUpdates = new HashMap<>();

                    globalUpdates.putAll(instService.processInstLogic(instPrice, typeInst, action, curZoneComplexe, curPreAppel));
                    globalUpdates.putAll(mesService.processMesLogic(mesPrice, action, curInt, curTel, curTv, curMes, curBranch, curWifi));
                    globalUpdates.putAll(matService.processMatLogic(matPrice, action, curFournisseur));
                    globalUpdates.putAll(logService.processLogistiqueLogic(logPrice, action, curRepeteurs));
                    globalUpdates.putAll(supportService.processSupportLogic(supPrice, action, curDevis));

                    // ✍️ ECRITURE DE LA LIGNE DANS LE NOUVEL EXCEL ✍️
                    for (int i = 0; i < headers.size(); i++) {
                        String colName = headers.get(i);
                        String normColName = normalizedHeaders.get(i);

                        Cell newCell = rowWriter.createCell(i);

                        Object updatedValue = null;
                        for (Map.Entry<String, Object> entry : globalUpdates.entrySet()) {
                            // On normalise aussi la clé du Map d'update bach t-matchi 100% m3a l'Excel
                            String normalizedUpdateKey = entry.getKey().toLowerCase().replaceAll("[\\s_'-]", "");
                            if (normalizedUpdateKey.equals(normColName)) {
                                updatedValue = entry.getValue();
                                break;
                            }
                        }

                        if (updatedValue != null) {
                            if (updatedValue instanceof Boolean) {
                                newCell.setCellValue((Boolean) updatedValue ? "true" : "false");
                            } else if (updatedValue instanceof Number) {
                                newCell.setCellValue(((Number) updatedValue).doubleValue());
                            } else {
                                newCell.setCellValue(updatedValue.toString().trim());
                            }
                        } else {
                            String originalValue = currentRowData.get(normColName);
                            if (originalValue != null) {
                                String origClean = originalValue.trim();
                                String origLower = origClean.toLowerCase();

                                if (origLower.equals("true") || origLower.equals("false") || origLower.equals("vrai") || origLower.equals("faux")) {
                                    newCell.setCellValue(origLower.equals("true") || origLower.equals("vrai") ? "true" : "false");
                                    continue;
                                }

                                try {
                                    if (origClean.matches("-?\\d+(\\.\\d+)?")) {
                                        newCell.setCellValue(Double.parseDouble(origClean));
                                        continue;
                                    }
                                } catch (Exception ignored) {}

                                newCell.setCellValue(origClean);
                            } else {
                                newCell.setCellValue("");
                            }
                        }
                    }
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wbWriter.write(out);
            return out.toByteArray();
        }
    }
}