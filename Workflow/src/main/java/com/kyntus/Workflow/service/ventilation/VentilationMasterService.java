package com.kyntus.Workflow.service.ventilation;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyntus.Workflow.entity.VentilationData;
import com.kyntus.Workflow.repository.VentilationDataRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // 🔥 L-IMPORT LI ZEDNA 🔥
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class VentilationMasterService {

    private final VentilationExcelParser excelParser;
    private final VentilationDataRepository repository;
    private final ObjectMapper objectMapper;

    public VentilationMasterService(VentilationExcelParser excelParser, VentilationDataRepository repository, ObjectMapper objectMapper) {
        this.excelParser = excelParser;
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    /**
     * 🚀 IMPORT KHFIF: Transactional bash PostgreSQL y-qbel l-LOB
     */
    @Transactional // 🔥 ZEDNA HADI 🔥
    public Map<String, List<Map<String, String>>> processAndSaveVentilation(MultipartFile file, int year, int month) throws Exception {

        Map<String, List<Map<String, String>>> rawData = excelParser.parseAllSheets(file);
        String jsonString = objectMapper.writeValueAsString(rawData);

        Optional<VentilationData> existingRecord = repository.findByYearAndMonth(year, month);
        VentilationData ventilationData = existingRecord.orElseGet(VentilationData::new);

        ventilationData.setYear(year);
        ventilationData.setMonth(month);
        ventilationData.setJsonData(jsonString);

        repository.save(ventilationData);

        return rawData;
    }

    /**
     * 📥 FETCH DATA: Transactional(readOnly=true) bash PostgreSQL y-qra l-LOB b' ra7to bla may-crashi
     */
    @Transactional(readOnly = true) // 🔥 L-FIX L-KBIR HOWA HADA 🔥
    public Map<String, List<Map<String, String>>> getVentilationData(int year, int month) throws Exception {
        Optional<VentilationData> record = repository.findByYearAndMonth(year, month);

        if (record.isPresent()) {
            String jsonString = record.get().getJsonData();
            return objectMapper.readValue(jsonString, new TypeReference<Map<String, List<Map<String, String>>>>() {});
        }
        return null;
    }

    /**
     * 🗑️ PURGE DATA
     */
    @Transactional // 🔥 ZEDNA HADI 🔥
    public void deleteVentilationData(int year, int month) {
        repository.deleteByYearAndMonth(year, month);
    }
}