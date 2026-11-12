package com.kyntus.Workflow.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Kay-dmen bli KOL erreur dyal l-API kat-rje3 JSON s7i7 (b champ "error"),
 * machi page HTML wla body khawi. Hakka l-frontend ma-kay-tle3-ch
 * "SyntaxError: Unexpected token '<'" wla "Unexpected token 'I'".
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static ResponseEntity<Map<String, Object>> body(HttpStatus status, String message, Throwable t) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("status", status.value());
        payload.put("error", message);
        if (t != null) {
            payload.put("type", t.getClass().getSimpleName());
        }
        return ResponseEntity.status(status).body(payload);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> onTooBig(MaxUploadSizeExceededException e) {
        return body(HttpStatus.PAYLOAD_TOO_LARGE,
                "Fichier trop volumineux (limite 500 Mo).", e);
    }

    /**
     * OutOfMemoryError ma-kat-tsnad-ch hna 3la 9sed : m3a -XX:+ExitOnOutOfMemoryError
     * bghina l'JVM t-mout w Docker y-redemmerha, machi n-khebbiwha w n-b9aw
     * khddamin b conteneur m-blokiy.
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> onIllegalState(IllegalStateException e) {
        return body(HttpStatus.SERVICE_UNAVAILABLE,
                e.getMessage() == null ? "Service momentanément indisponible." : e.getMessage(), e);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> onAny(Exception e) {
        e.printStackTrace();
        return body(HttpStatus.INTERNAL_SERVER_ERROR,
                e.getMessage() == null ? "Erreur interne du serveur." : e.getMessage(), e);
    }
}
