package com.kyntus.Workflow.service.facture;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.*;

@Service
public class FactureMasterService {

    @Autowired
    private MesProcessorService mesProcessorService;

    // ⚡ HashSet bash `.contains()` tkon O(1) instantanée f' 25k lignes
    private static final Set<String> VIP_INSEE_CODES = new HashSet<>(Arrays.asList(
            "13215", "13203", "13212", "13211", "13210", "13209", "33179", "33236", "33122",
            "33019", "33199", "33063", "91600", "91665", "91494", "91363", "91103", "91661",
            "91339", "91692", "91552", "91345", "91223", "91174", "84138", "84072", "84003",
            "84019", "84137", "27284", "27469", "27229", "85163", "85011", "85106", "85113", "85083"
    ));

    private static final Set<String> COLS_TO_HIDE = new HashSet<>(Arrays.asList(
            "ADD", "ETAT_ADD", "DATE_INDIC", "EMUT", "REPROV", "TVC", "BTBD / HESTIA",
            "PREEQ", "TOTAL_TIC", "TOTAL_CA", "MISE_EN_SERVICE", "AGENT",
            "NOK CMD / NOK RDV", "ETAT NOK CMD / NOK RDV", "NOK REF PTO", "ETAT NOK REF PTO",
            "CODE INSEE", "CODE_INSEE", "REPETEUR", "PREAPPEL", "DEVIS"
    ));

    public byte[] generateFinalFacture(
            MultipartFile fichierAVide,
            Map<String, String> repeteurMap,
            Map<String, String> tvcMap,
            Map<String, String> diagWifiMap,
            Map<String, QaProcessorService.QaData> qaMap,
            Map<String, MesProcessorService.MesResult> mesMap,
            Map<String, String> offreMap,
            Map<String, Double> devisMap) throws Exception {

        if (mesMap == null) {
            mesMap = new LinkedHashMap<>(32768);
        }

        try (InputStream is = fichierAVide.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            workbook.setSheetName(0, "A REMPLIS");
            Sheet sheet = workbook.getSheetAt(0);

            Row headerRow = findHeaderRow(sheet);
            int startRow = headerRow.getRowNum() + 1;

            int colRepeteurOut = getOrCreateColumn(headerRow, "REPETEUR");
            int colDiagWifiOut = getOrCreateColumn(headerRow, "DIAGWIFI");
            int colTvcOut      = getOrCreateColumn(headerRow, "TVC");
            int colPreappelOut = getOrCreateColumn(headerRow, "PREAPPEL");
            int colDevisOut    = getOrCreateColumn(headerRow, "DEVIS");

            int colInter = -1, colEtat = -1, colPtoInstalled = -1;
            int colCategReal = -1, colCategTic = -1, colCodeInsee = -1;
            int colLogistique = -1, colSupport = -1, colMateriel = -1;
            int colCodePostal = -1, colCoefZone = -1, colInstallation = -1, colMes = -1;
            int colPrixHtGoulotte = -1, colPrixHtEth = -1, colDeplacement = -1, colTotal = -1;
            int colLibelle = -1, colTvcInput = -1;
            int colInternet = -1, colPhone = -1, colTv = -1;

            List<Integer> hiddenColIndices = new ArrayList<>();

            for (Cell cell : headerRow) {
                if (cell.getCellType() != CellType.STRING) continue;
                String header = cell.getStringCellValue().trim().toUpperCase();

                if (header.equals("CODE_INTER") || header.equals("INTERVENTION")) colInter = cell.getColumnIndex();
                else if (header.equals("ETAT")) colEtat = cell.getColumnIndex();
                else if (header.equals("LIBELLE") || header.equals("LIBELLÉ") || header.contains("LIBELLE OFFRE") || header.equals("LIBELLÉ DE L'OFFRE")) colLibelle = cell.getColumnIndex();
                else if (header.equals("PTO_INSTALLED")) colPtoInstalled = cell.getColumnIndex();
                else if (header.equals("CATEG_RACC_LOGMNT_REAL")) colCategReal = cell.getColumnIndex();
                else if (header.equals("CATEG_RACC_LOGMNT_REAL_TIC")) colCategTic = cell.getColumnIndex();
                else if (header.equals("CODE INSEE") || header.equals("CODE_INSEE")) colCodeInsee = cell.getColumnIndex();
                else if (header.equals("LOGISTIQUE")) colLogistique = cell.getColumnIndex();
                else if (header.equals("SUPPORT")) colSupport = cell.getColumnIndex();
                else if (header.equals("MATERIEL")) colMateriel = cell.getColumnIndex();
                else if (header.equals("CODE_POSTAL")) colCodePostal = cell.getColumnIndex();
                else if (header.equals("COEFF_ZONE")) colCoefZone = cell.getColumnIndex();
                else if (header.equals("INSTALLATION")) colInstallation = cell.getColumnIndex();
                else if (header.equals("MES")) colMes = cell.getColumnIndex();
                else if (header.equals("PRIX_HT_GOULOTTE")) colPrixHtGoulotte = cell.getColumnIndex();
                else if (header.equals("PRIX_HT_ETH")) colPrixHtEth = cell.getColumnIndex();
                else if (header.equals("DEPLACEMENT")) colDeplacement = cell.getColumnIndex();
                else if (header.equals("TOTAL")) colTotal = cell.getColumnIndex();
                else if (header.equals("TVC")) colTvcInput = cell.getColumnIndex();
                else if (header.equals("INTERNET_STATUS")) colInternet = cell.getColumnIndex();
                else if (header.equals("PHONE_STATUS")) colPhone = cell.getColumnIndex();
                else if (header.equals("TV_STATUS")) colTv = cell.getColumnIndex();

                if (COLS_TO_HIDE.contains(header)) {
                    hiddenColIndices.add(cell.getColumnIndex());
                }
            }

            if (colTotal == -1) colTotal = getOrCreateColumn(headerRow, "TOTAL");

            int lastRowNum = sheet.getLastRowNum();
            for (int i = startRow; i <= lastRowNum; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Cell cellEtat = safeGetCell(row, colEtat);
                if (cellEtat == null) continue;
                String etat = getCellValueAsString(cellEtat).trim();

                if (!"TERMINEE_OK".equalsIgnoreCase(etat)) continue;
                String codeInter = getCellValueAsString(safeGetCell(row, colInter)).trim();
                if (codeInter.isEmpty()) continue;

                // UPDATE DYAL LIBELLE
                String oldLibelle = colLibelle != -1 ? getCellValueAsString(safeGetCell(row, colLibelle)).trim() : "";
                String newLibelle = offreMap.getOrDefault(codeInter, oldLibelle);
                if (colLibelle != -1) {
                    setCellString(row, colLibelle, newLibelle);
                }

                // ⚡ CALCUL MES EN DIRECT (SINGLE-PASS)
                MesProcessorService.MesResult mesResult = mesMap.get(codeInter);
                if (mesResult == null && mesProcessorService != null) {
                    String internet = getCellValueAsString(safeGetCell(row, colInternet)).trim();
                    String phone = getCellValueAsString(safeGetCell(row, colPhone)).trim();
                    String tv = getCellValueAsString(safeGetCell(row, colTv)).trim();
                    mesResult = mesProcessorService.computeSingleRowMes(
                            codeInter, oldLibelle, internet, phone, tv, diagWifiMap, qaMap, offreMap
                    );
                    mesMap.put(codeInter, mesResult);
                }

                // LOGISTIQUE (Repeteur)
                String repVal = repeteurMap.getOrDefault(codeInter, "0");
                double logistiqueVal = parseDoubleSafe(repVal);
                setCellNumeric(row, colLogistique, logistiqueVal);
                setCellNumeric(row, colRepeteurOut, logistiqueVal);

                // SUPPORT, TVC & DEVIS
                String tvcTypologie = tvcMap.getOrDefault(codeInter, "");
                double supportVal = (tvcTypologie.equalsIgnoreCase("Durée") || tvcTypologie.equalsIgnoreCase("Longueur")) ? 200.0 : 0.0;

                if (devisMap != null && devisMap.containsKey(codeInter)) {
                    supportVal = devisMap.get(codeInter);
                    setCellNumeric(row, colDevisOut, supportVal);
                }

                setCellNumeric(row, colSupport, supportVal);
                setCellString(row, colTvcOut, tvcTypologie);
                setCellString(row, colDiagWifiOut, diagWifiMap.getOrDefault(codeInter, ""));

                // MATERIEL
                String tvcInputVal = colTvcInput != -1 ? getCellValueAsString(safeGetCell(row, colTvcInput)).trim() : "";
                boolean isTvcZeroOrEmpty = tvcInputVal.isEmpty() || "0".equals(tvcInputVal) || "vide".equalsIgnoreCase(tvcInputVal);

                double rawInstallation = getCellNumericFast(safeGetCell(row, colInstallation));
                double currentMateriel = getCellNumericFast(safeGetCell(row, colMateriel));
                double materielVal = calculateMaterielByInstallation(rawInstallation, currentMateriel);

                if (!isTvcZeroOrEmpty) {
                    if (materielVal == 11.03) materielVal = 53.14;
                    else if (materielVal == 31.28) materielVal = 115.21;
                    else if (materielVal == 28.62) materielVal = 77.41;
                    else if (materielVal == 41.22 || materielVal == 41.21) materielVal = 128.0;
                }
                setCellNumeric(row, colMateriel, materielVal);

                // CODE POSTAL & COEF ZONE
                String codeInsee = getCellValueAsString(safeGetCell(row, colCodeInsee)).trim();
                setCellString(row, colCodePostal, codeInsee);
                double coefZone = VIP_INSEE_CODES.contains(codeInsee) ? 1.15 : 1.0;
                setCellNumeric(row, colCoefZone, coefZone);

                // INSTALLATION
                double baseInstallation;
                String pto = getCellValueAsString(safeGetCell(row, colPtoInstalled)).trim();

                if ("E2".equalsIgnoreCase(pto) || "O".equalsIgnoreCase(pto)) {
                    int valReal = getCategValue(getCellValueAsString(safeGetCell(row, colCategReal)).toLowerCase());
                    int valTic = getCategValue(getCellValueAsString(safeGetCell(row, colCategTic)).toLowerCase());
                    baseInstallation = Math.max(valReal, valTic);
                } else {
                    if (rawInstallation == 77.05) baseInstallation = 67;
                    else if (rawInstallation == 98.90) baseInstallation = 86;
                    else if (rawInstallation == 124.20) baseInstallation = 108;
                    else if (rawInstallation == 250.70) baseInstallation = 218;
                    else if (rawInstallation == 313.95) baseInstallation = 273;
                    else if (rawInstallation == 348.45) baseInstallation = 303;
                    else baseInstallation = rawInstallation;
                }
                double finalInstallation = baseInstallation * coefZone;
                setCellNumeric(row, colInstallation, finalInstallation);

                // MES
                double mesVal = mesResult != null ? mesResult.mtPlusDiagWifi : 0.0;
                setCellNumeric(row, colMes, mesVal);

                // TOTAL
                double prixGoulotte = getCellNumericFast(safeGetCell(row, colPrixHtGoulotte));
                double prixEth = getCellNumericFast(safeGetCell(row, colPrixHtEth));
                double deplacement = getCellNumericFast(safeGetCell(row, colDeplacement));

                double totalFacture = prixGoulotte + prixEth + finalInstallation + mesVal + materielVal + supportVal + logistiqueVal + deplacement;
                setCellNumeric(row, colTotal, totalFacture);
            }

            for (int hideIdx : hiddenColIndices) {
                sheet.setColumnHidden(hideIdx, true);
            }

            // CREATION DYAL LES SHEETS JDAD
            Sheet sheetTvc = workbook.createSheet("TVC");
            createHeaderRow(sheetTvc, "Intervention", "Typologie");
            int r = 1;
            for (Map.Entry<String, String> entry : tvcMap.entrySet()) {
                Row row = sheetTvc.createRow(r++);
                row.createCell(0).setCellValue(entry.getKey());
                row.createCell(1).setCellValue(entry.getValue());
            }

            Sheet sheetRep = workbook.createSheet("Repeteur");
            createHeaderRow(sheetRep, "Intervention", "Resultat (MT)");
            r = 1;
            for (Map.Entry<String, String> entry : repeteurMap.entrySet()) {
                Row row = sheetRep.createRow(r++);
                row.createCell(0).setCellValue(entry.getKey());
                row.createCell(1).setCellValue(entry.getValue());
            }

            Sheet sheetDiag = workbook.createSheet("Diag Wifi");
            createHeaderRow(sheetDiag, "Intervention", "Diagnostic WiFi réalisé");
            r = 1;
            for (Map.Entry<String, String> entry : diagWifiMap.entrySet()) {
                Row row = sheetDiag.createRow(r++);
                row.createCell(0).setCellValue(entry.getKey());
                row.createCell(1).setCellValue(entry.getValue());
            }

            Sheet sheetQa = workbook.createSheet("QA_Donnees");
            createHeaderRow(sheetQa, "Intervention", "MES Quest", "MAT LIV", "QUESTION TV");
            r = 1;
            for (Map.Entry<String, QaProcessorService.QaData> entry : qaMap.entrySet()) {
                Row row = sheetQa.createRow(r++);
                QaProcessorService.QaData q = entry.getValue();
                row.createCell(0).setCellValue(entry.getKey());
                row.createCell(1).setCellValue(q.mesQuest);
                row.createCell(2).setCellValue(q.matLiv);
                row.createCell(3).setCellValue(q.questionTv);
            }

            Sheet sheetMes = workbook.createSheet("MESQuest");
            createHeaderRow(sheetMes, "CODE_INTER", "DIAG WIFI", "MAT LIV", "MES QUEST", "Libellé Offre", "QUESTION TV", "TYPE MES", "TYPE MES 1P/2P/3P", "INTERNET", "PHONE", "TV", "CODE_INTER_DUP", "MT", "MT+ DIAG WIFI");
            r = 1;
            for (Map.Entry<String, MesProcessorService.MesResult> entry : mesMap.entrySet()) {
                Row row = sheetMes.createRow(r++);
                MesProcessorService.MesResult mes = entry.getValue();
                row.createCell(0).setCellValue(mes.codeInter);
                row.createCell(1).setCellValue(mes.diagWifi);
                row.createCell(2).setCellValue(mes.matLiv);
                row.createCell(3).setCellValue(mes.mesQuest);
                row.createCell(4).setCellValue(mes.libelleOffre);
                row.createCell(5).setCellValue(mes.questionTv);
                row.createCell(6).setCellValue(mes.typeMes);
                row.createCell(7).setCellValue(mes.typeMes123p);
                row.createCell(8).setCellValue(mes.internet);
                row.createCell(9).setCellValue(mes.phone);
                row.createCell(10).setCellValue(mes.tv);
                row.createCell(11).setCellValue(mes.codeInterDup);
                row.createCell(12).setCellValue(mes.mt);
                row.createCell(13).setCellValue(mes.mtPlusDiagWifi);
            }

            ByteArrayOutputStream bos = new ByteArrayOutputStream(8 * 1024 * 1024);
            workbook.write(bos);
            return bos.toByteArray();
        }
    }

    private double calculateMaterielByInstallation(double inst, double fallback) {
        double val = Math.round(inst * 100.0) / 100.0;
        if (val == 0.0 || val == 67.0 || val == 70.0 || val == 77.05 || val == 80.05) return 1.46;
        if (val == 108.0 || val == 111.0 || val == 124.2 || val == 127.65) return 11.03;
        if (val == 218.0 || val == 221.0 || val == 250.7 || val == 254.15) return 31.28;
        if (val == 273.0 || val == 276.0 || val == 313.95 || val == 317.4) return 28.62;
        if (val == 86.0 || val == 89.0 || val == 98.9 || val == 102.35) return 8.61;
        if (val == 303.0 || val == 306.0 || val == 348.45 || val == 351.9) return 41.22;
        return fallback;
    }

    private int getOrCreateColumn(Row headerRow, String colName) {
        for (Cell cell : headerRow) {
            if (cell != null && cell.getCellType() == CellType.STRING) {
                if (cell.getStringCellValue().trim().equalsIgnoreCase(colName)) {
                    return cell.getColumnIndex();
                }
            }
        }
        int newIdx = headerRow.getLastCellNum();
        if (newIdx < 0) newIdx = 0;
        headerRow.createCell(newIdx).setCellValue(colName.toUpperCase());
        return newIdx;
    }

    private Row findHeaderRow(Sheet sheet) {
        for (int i = 0; i < 10; i++) {
            Row row = sheet.getRow(i);
            if (row != null) {
                for (Cell cell : row) {
                    if (cell.getCellType() == CellType.STRING) {
                        String val = cell.getStringCellValue().trim().toUpperCase();
                        if (val.equals("CODE_INTER") || val.equals("ETAT") || val.contains("INTERVENTION")) {
                            return row;
                        }
                    }
                }
            }
        }
        return sheet.getRow(0);
    }

    private Cell safeGetCell(Row row, int colIndex) {
        if (colIndex < 0 || row == null) return null;
        return row.getCell(colIndex);
    }

    private double getCellNumericFast(Cell cell) {
        if (cell == null) return 0.0;
        CellType type = cell.getCellType();
        if (type == CellType.NUMERIC) return cell.getNumericCellValue();
        if (type == CellType.STRING) return parseDoubleSafe(cell.getStringCellValue());
        return 0.0;
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        CellType type = cell.getCellType();
        if (type == CellType.STRING) return cell.getStringCellValue();
        if (type == CellType.NUMERIC) {
            double val = cell.getNumericCellValue();
            return (val == Math.floor(val)) ? String.valueOf((long) val) : String.valueOf(val);
        }
        return cell.toString();
    }

    private double parseDoubleSafe(String val) {
        if (val == null || val.isEmpty()) return 0.0;
        try { return Double.parseDouble(val.trim().replace(',', '.')); } catch (Exception e) { return 0.0; }
    }

    private void setCellNumeric(Row row, int colIndex, double value) {
        if (colIndex == -1) return;
        Cell cell = row.getCell(colIndex);
        if (cell == null) cell = row.createCell(colIndex);
        cell.setCellValue(value);
    }

    private void setCellString(Row row, int colIndex, String value) {
        if (colIndex == -1) return;
        Cell cell = row.getCell(colIndex);
        if (cell == null) cell = row.createCell(colIndex);
        cell.setCellValue(value);
    }

    private int getCategValue(String categ) {
        if (categ.contains("aerien") || categ.contains("aérien")) return 303;
        if (categ.contains("facade") || categ.contains("façade")) return 273;
        if (categ.contains("chambre")) return 218;
        if (categ.contains("immeuble")) return 108;
        return 0;
    }

    private void createHeaderRow(Sheet sheet, String... headers) {
        Row row = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            row.createCell(i).setCellValue(headers[i]);
        }
    }
}