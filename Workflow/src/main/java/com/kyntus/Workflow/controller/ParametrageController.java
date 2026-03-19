package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.service.ParametrageMasterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/parametrage")
@CrossOrigin(originPatterns = "*")
public class ParametrageController {

    private final ParametrageMasterService parametrageMasterService;

    public ParametrageController(ParametrageMasterService parametrageMasterService) {
        this.parametrageMasterService = parametrageMasterService;
    }

    // 🚀 L'ENDPOINT DE DECLENCHEMENT DU MOTEUR DE PARAMETRAGE 🚀
    @PostMapping("/process")
    public ResponseEntity<byte[]> processParametrage(@RequestParam("file") MultipartFile file) {
        try {
            byte[] excelData = parametrageMasterService.processParametrageFile(file);

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Resultat_Parametrage_Auto.xlsx");

            return new ResponseEntity<>(excelData, headers, org.springframework.http.HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}