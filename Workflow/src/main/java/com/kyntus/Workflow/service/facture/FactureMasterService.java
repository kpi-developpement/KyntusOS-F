package com.kyntus.Workflow.service.facture;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Service
public class FactureMasterService {

    private static final List<String> VIP_INSEE_CODES = Arrays.asList(
            "13215", "13203", "13212", "13211", "13210", "13209", "33179", "33236", "33122",
            "33019", "33199", "33063", "91600", "91665", "91494", "91363", "91103", "91661",
            "91339", "91692", "91552", "91345", "91223", "91174", "84138", "84072", "84003",
            "84019", "84137", "27284", "27469", "27229", "85163", "85011", "85106", "85113", "85083"
    );

    // 🔥 LISTE DYAL LES COLONNES LI GHAY-T-GEL3OU (HIDE) 🔥
    private static final List<String> COLS_TO_HIDE = Arrays.asList(
            "ADD", "ETAT_ADD", "DATE_INDIC", "EMUT", "REPROV", "TVC", "BTBD / HESTIA",
            "PREEQ", "TOTAL_TIC", "TOTAL_CA", "MISE_EN_SERVICE", "AGENT",
            "NOK CMD / NOK RDV", "ETAT NOK CMD / NOK RDV", "NOK REF PTO", "ETAT NOK REF PTO",
            "CODE INSEE", "CODE_INSEE", "REPETEUR", "PREAPPEL", "DEVIS"
    );

    public byte[] generateFinalFacture(
            MultipartFile fichierAVide,
            Map<String, String> repeteurMap,
            Map<String, String> tvcMap,
            Map<String, String> diagWifiMap,
            Map<String, QaProcessorService.QaData> qaMap,
            Map<String, MesProcessorService.MesResult> mesMap,
            Map<String, String> offreMap,
            Map<String, Double> devisMap) throws Exception { // 🔥 Zidna devisMap hna 🔥

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

            List<Integer> hiddenColIndices = new ArrayList<>();

            for (Cell cell : headerRow) {
                String header = cell.getStringCellValue().trim().toUpperCase();

                if (header.equals("CODE_INTER") || header.equals("INTERVENTION")) colInter = cell.getColumnIndex();
                else if (header.equals("ETAT")) colEtat = cell.getColumnIndex();
                else if (header.equals("LIBELLE") || header.equals("LIBELLÉ") || header.contains("LIBELLE OFFRE")) colLibelle = cell.getColumnIndex();
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

                // 🧹 T-tqeeyad dyal les colonnes li ghadi n-khebbiyouhom 🧹
                if (COLS_TO_HIDE.contains(header)) {
                    hiddenColIndices.add(cell.getColumnIndex());
                }
            }

            if (colTotal == -1) colTotal = getOrCreateColumn(headerRow, "TOTAL");

            for (int i = startRow; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Cell cellEtat = safeGetCell(row, colEtat);
                if (cellEtat == null) continue;
                String etat = getCellValueAsString(cellEtat).trim().toUpperCase();

                if (!etat.equals("TERMINEE_OK")) continue;
                String codeInter = getCellValueAsString(safeGetCell(row, colInter)).trim();

                // UPDATE DYAL LIBELLE
                if (colLibelle != -1) {
                    String oldLibelle = getCellValueAsString(safeGetCell(row, colLibelle)).trim();
                    String newLibelle = offreMap.getOrDefault(codeInter, oldLibelle);
                    setCellValue(row, colLibelle, newLibelle);
                }

                // LOGISTIQUE (Repeteur)
                String repVal = repeteurMap.getOrDefault(codeInter, "0");
                double logistiqueVal = parseDoubleSafe(repVal);
                setCellValue(row, colLogistique, repVal);
                setCellValue(row, colRepeteurOut, repVal);

                // ==========================================
                // 🛠️ SUPPORT, TVC & DEVIS (MANUAL OVERRIDE) 🛠️
                // ==========================================
                String tvcTypologie = tvcMap.getOrDefault(codeInter, "");
                double supportVal = (tvcTypologie.equalsIgnoreCase("Durée") || tvcTypologie.equalsIgnoreCase("Longueur")) ? 200.0 : 0.0;

                // 🔥 THE MAGIC HAPPENS HERE: Ila kayn f' Devis, bddel SUPPORT d-zzez! 🔥
                if (devisMap != null && devisMap.containsKey(codeInter)) {
                    supportVal = devisMap.get(codeInter);
                    // N-Sayviwha 7ta f' la colonne DEVIS bash t-bqa trace
                    setCellValue(row, colDevisOut, String.valueOf(supportVal));
                }

                setCellValue(row, colSupport, String.valueOf(supportVal));
                setCellValue(row, colTvcOut, tvcTypologie);

                // DIAG WIFI
                setCellValue(row, colDiagWifiOut, diagWifiMap.getOrDefault(codeInter, "FAUX"));

                // MATERIEL
                String tvcInputVal = "";
                if (colTvcInput != -1) {
                    tvcInputVal = getCellValueAsString(safeGetCell(row, colTvcInput)).trim().toLowerCase();
                }
                boolean isTvcZeroOrEmpty = tvcInputVal.isEmpty() || tvcInputVal.equals("0") || tvcInputVal.equals("vide");

                double ahVal = parseDoubleSafe(getCellValueAsString(safeGetCell(row, colMateriel)));
                double materielVal = 0.0;

                if (isTvcZeroOrEmpty) {
                    if (ahVal == 0.0) materielVal = 0.0;
                    else if (ahVal == 12.77) materielVal = 11.03;
                    else if (ahVal == 33.02) materielVal = 31.28;
                    else if (ahVal == 30.36) materielVal = 28.62;
                    else if (ahVal == 42.96) materielVal = 41.22;
                    else if (ahVal == 3.20) materielVal = 1.46;
                    else if (ahVal == 10.35) materielVal = 8.61;
                    else materielVal = ahVal;
                } else {
                    if (ahVal == 0.0) materielVal = 0.0;
                    else if (ahVal == 12.77) materielVal = 53.14;
                    else if (ahVal == 33.02) materielVal = 115.21;
                    else if (ahVal == 30.36) materielVal = 77.41;
                    else if (ahVal == 42.96) materielVal = 128.0;
                    else materielVal = ahVal;
                }
                setCellValue(row, colMateriel, String.valueOf(materielVal));

                // CODE POSTAL & COEF ZONE
                String codeInsee = getCellValueAsString(safeGetCell(row, colCodeInsee)).trim();
                setCellValue(row, colCodePostal, codeInsee);
                double coefZone = VIP_INSEE_CODES.contains(codeInsee) ? 1.15 : 1.0;
                setCellValue(row, colCoefZone, String.valueOf(coefZone));

                // INSTALLATION
                double baseInstallation = 0.0;
                String pto = getCellValueAsString(safeGetCell(row, colPtoInstalled)).trim().toUpperCase();

                if (pto.equals("E2") || pto.equals("O")) {
                    int valReal = getCategValue(getCellValueAsString(safeGetCell(row, colCategReal)).toLowerCase());
                    int valTic = getCategValue(getCellValueAsString(safeGetCell(row, colCategTic)).toLowerCase());
                    baseInstallation = Math.max(valReal, valTic);
                } else {
                    double afVal = parseDoubleSafe(getCellValueAsString(safeGetCell(row, colInstallation)));
                    if (afVal == 77.05) baseInstallation = 67;
                    else if (afVal == 98.90) baseInstallation = 86;
                    else if (afVal == 124.20) baseInstallation = 108;
                    else if (afVal == 250.70) baseInstallation = 218;
                    else if (afVal == 313.95) baseInstallation = 273;
                    else if (afVal == 348.45) baseInstallation = 303;
                    else baseInstallation = afVal;
                }
                double finalInstallation = baseInstallation * coefZone;
                setCellValue(row, colInstallation, String.valueOf(finalInstallation));

                // MES
                MesProcessorService.MesResult mesResult = mesMap.get(codeInter);
                double mesVal = mesResult != null ? mesResult.mtPlusDiagWifi : 0.0;
                setCellValue(row, colMes, String.valueOf(mesVal));

                // TOTAL
                double prixGoulotte = parseDoubleSafe(getCellValueAsString(safeGetCell(row, colPrixHtGoulotte)));
                double prixEth = parseDoubleSafe(getCellValueAsString(safeGetCell(row, colPrixHtEth)));
                double deplacement = parseDoubleSafe(getCellValueAsString(safeGetCell(row, colDeplacement)));

                // 🎯 TOTAL kay-stafeed mn l-Override dyal SUPPORT 🎯
                double totalFacture = prixGoulotte + prixEth + finalInstallation + mesVal + materielVal + supportVal + logistiqueVal + deplacement;
                setCellValue(row, colTotal, String.valueOf(totalFacture));
            }

            // 🧹 N-KHEBBIW LES COLONNES MN L-FICHIER A REMPLIS 🧹
            for (int hideIdx : hiddenColIndices) {
                sheet.setColumnHidden(hideIdx, true);
            }

            // ==========================================
            // CREATION DYAL LES SHEETS JDAD
            // ==========================================
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
                row.createCell(0).setCellValue(entry.getKey());
                row.createCell(1).setCellValue(entry.getValue().mesQuest);
                row.createCell(2).setCellValue(entry.getValue().matLiv);
                row.createCell(3).setCellValue(entry.getValue().questionTv);
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

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            workbook.write(bos);
            return bos.toByteArray();
        }
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

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue();
        if (cell.getCellType() == CellType.NUMERIC) {
            double val = cell.getNumericCellValue();
            return (val == Math.floor(val)) ? String.valueOf((long) val) : String.valueOf(val);
        }
        return cell.toString();
    }

    private boolean isCellEmpty(Cell cell) {
        return (cell == null || cell.getCellType() == CellType.BLANK || getCellValueAsString(cell).trim().isEmpty());
    }

    private double parseDoubleSafe(String val) {
        if (val == null || val.trim().isEmpty()) return 0.0;
        try { return Double.parseDouble(val.replace(",", ".")); } catch (Exception e) { return 0.0; }
    }

    private void setCellValue(Row row, int colIndex, String value) {
        if (colIndex == -1) return;
        Cell cell = row.getCell(colIndex);
        if (cell == null) cell = row.createCell(colIndex);
        try {
            cell.setCellValue(Double.parseDouble(value.replace(",", ".")));
        } catch (NumberFormatException e) {
            cell.setCellValue(value);
        }
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