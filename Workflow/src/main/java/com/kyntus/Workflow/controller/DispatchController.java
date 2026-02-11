package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.dto.DispatchRequestDto;
import com.kyntus.Workflow.service.DispatchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dispatch")
@CrossOrigin(origins = "http://localhost:3000")
public class DispatchController {

    private final DispatchService dispatchService;

    public DispatchController(DispatchService dispatchService) {
        this.dispatchService = dispatchService;
    }

    @PostMapping("/execute")
    public ResponseEntity<Map<String, String>> executeDispatch(@RequestBody DispatchRequestDto request) {
        try {
            dispatchService.executeDispatch(request);

            Map<String, String> response = new HashMap<>();
            response.put("status", "SUCCESS");
            response.put("message", "Opération de dispatch terminée.");

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            e.printStackTrace();
            Map<String, String> error = new HashMap<>();
            error.put("status", "ERROR");
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}