# Project: KyntusOS-F
_llm_extractor v3.0 · 2026-11-27 18:09 · 28 files · ~12,717 tokens_

> **How to read:** comments and import/using/package lines are stripped; files marked `[sig]` show signatures only: `{ … }` / `...` = body omitted; `[omitted]` = exists in the project but left out (token budget); `***` = redacted secret.

## Overview
**Stack:** Next.js 16, React 19, Three.js, R3F, TypeScript, Framer Motion
**Files:** java 107, tsx 83, css 40, ts 6, md 2, yaml 2, dockerfile 2, json 2, xml 1, properties 1, js 1
**Manifests:**
- `frontend/package.json` — scripts: dev=`next dev` | build=`next build` | start=`next start` | lint=`eslint` · deps: @react-spring/three@10.0.3, @react-three/drei@10.7.7, @react-three/fiber@9.5.0, @stomp/stompjs@7.3.0, framer-motion@12.38.0, lucide-react@0.563.0, next@16.1.6, react@19.2.3, react-dom@19.2.3, sockjs-client@1.6.1, three@0.182.0, xlsx@0.18.5 · devDeps: @types/node, @types/react, @types/react-dom, @types/three, babel-plugin-react-compiler, eslint, eslint-config-next, typescript

### API endpoints
- **AdminController**: GET /api/admin/search (searchByEps) · POST /api/admin/eps-tracer (traceEps) · POST /api/admin/flag-error/{taskId} (flagError) · POST /api/admin/points (manualPointsAdjustment) · GET /api/admin/points/history/{pilotId} (getPointsHistory)
- **AuthController**: POST /api/auth/login (login) · POST /api/auth/register (register)
- **BytelApiController**: POST /api/bytel/sync (synchroniser) · GET /api/bytel/sync/status (syncStatus) · POST /api/bytel/sync/annuler (syncAnnuler) · GET /api/bytel/sync/etats (syncEtats) · GET /api/bytel/live (live) · GET /api/bytel/qualifications (lister) · POST /api/bytel/qualifications/recherche (listerPost) · GET /api/bytel/versions (versions) · POST /api/bytel/versions/recherche (versionsPost) · POST /api/bytel/versions/par-eps (versionsParEps) · POST /api/bytel/export (exporter) · POST /api/bytel/export/equipe (exporterEquipe) · GET /api/bytel/export/{id}/status (exportStatus) · GET /api/bytel/export/{id}/fichier (exportFichier) · GET /api/bytel/timeline/{eps} (timeline) · GET /api/bytel/history/eps/{eps} (decisionsDeLEps) · GET /api/bytel/eps/{eps}/versions (versionsDeLEps) · GET /api/bytel/eps/{eps} (detailEps) · GET /api/bytel/etats (etats) · GET /api/bytel/types (types) · GET /api/bytel/types-qualification (typesQualification) · GET /api/bytel/periodes (periodes) · GET /api/bytel/stats (stats) · POST /api/bytel/actions (agir) · GET /api/bytel/actions/apercu (apercu) · POST /api/bytel/actions/lot (agirEnLot) · GET /api/bytel/historique (historique) · GET /api/bytel/config (config) · GET /api/bytel/alertes (alertes) · DELETE /api/bytel/purge (purger) · POST /api/bytel/omni (omni) · POST /api/bytel/omni/export (omniExport)
- **BytelDiagController**: GET /api/bytel/diag (diag)
- **BytelLocaliserController**: POST /api/bytel/localiser (localiser)
- **ContestationController**: POST /api/contestation/generate (generate)
- **DispatchController**: POST /api/dispatch/execute (executeDispatch)
- **ExportController**: GET /api/export/{templateId} (exportTemplate)
- **FactureController**: POST /api/facture/generate (generateFacture)
- **HealthController**: GET /api/health (liveness) · GET /api/health/db (database)
- **ImportController**: POST /api/import/{templateId} (uploadExcel)
- **ParametrageController**: POST /api/parametrage/process (processParametrage)
- **PilotEquipeController**: POST /api/equipe-export/track (exportEquipeTrack)
- **PilotRecordController**: POST /api/pilot-records/import/{pilotId} (importPilotData) · GET /api/pilot-records/{pilotId} (getPilotRecords) · DELETE /api/pilot-records/clear (clearDatabase) · DELETE /api/pilot-records/delete-file (deleteSpecificFile) · GET /api/pilot-records/export/{pilotId} (exportPilotRecords) · GET /api/pilot-records/versions (getAvailableVersions) · GET /api/pilot-records/etats (getAvailableEtats) · GET /api/pilot-records/history/{eps} (getEpsHistory) · POST /api/pilot-records/export-track-global (exportGlobalTrackHistory) · POST /api/pilot-records/export-global-search (exportGlobalSearch) · GET /api/pilot-records/imported-files (getImportedFiles) · GET /api/pilot-records/alerts (getValidationAlerts) · GET /api/pilot-records/alerts-comments (getDuplicateCommentAlerts) · GET /api/pilot-records/export-alerts (exportAlertsToExcel) · GET /api/pilot-records/export-alerts-comments (exportCommentAlertsToExcel) · DELETE /api/pilot-records/deduplicate (removeDuplicates) · DELETE /api/pilot-records/fix-69-files (fixRetroactiveDuplicates)
- **PilotSecureUploadController**: POST /api/secure-upload/import/{pilotId} (importSecureData) · GET /api/secure-upload/logs (getImportLogs) · PUT /api/secure-upload/reorder (reorderFiles)
- **RescueController**: GET /api/rescue/admin (createRescueAdmin) · GET /api/rescue/pilot (createRescuePilot)
- **StatsController**: GET /api/stats/leaderboard (getLeaderboard) · GET /api/stats/template/{templateId}/pilots (getPilotStatsForTemplate) · GET /api/stats/dashboard-summary (getDashboardSummary) · GET /api/stats/terrain (getTerrainStats)
- **TaskAndTemplateAdminController**: DELETE /api/templates/{templateId} (deleteTemplate) · PATCH /api/tasks/reassign (reassignTasks) · PATCH /api/tasks/{taskId}/validate-final (validateFinalByAdmin) · GET /api/tasks/search-eps (searchWhoWorkedOnEps)
- **TaskController**: GET /api/tasks (getTasks) · PATCH /api/tasks/{id}/status (updateStatus) · PATCH /api/tasks/{id}/data (updateData) · GET /api/tasks/unassigned (getUnassignedTasks) · GET /api/tasks/unassigned/{templateId} (getUnassignedTasksByTemplate) · GET /api/tasks/columns/{templateId} (getTemplateColumns) · GET /api/tasks/values/{templateId}/{columnKey} (getColumnValues)
- **TissueEquipeController**: POST /api/tissue-equipe-export/track (exportEquipeTrack)
- **TissueRecordController**: POST /api/tissue-records/import/{pilotId} (importTissueData) · GET /api/tissue-records/{pilotId} (getTissueRecords) · DELETE /api/tissue-records/clear (clearDatabase) · DELETE /api/tissue-records/delete-file (deleteSpecificFile) · GET /api/tissue-records/export/{pilotId} (exportTissueRecords) · GET /api/tissue-records/versions (getAvailableVersions) · GET /api/tissue-records/etats (getAvailableEtats) · GET /api/tissue-records/history/{eps} (getEpsHistory) · POST /api/tissue-records/export-track-global (exportGlobalTrackHistory) · POST /api/tissue-records/export-global-search (exportGlobalSearch) · GET /api/tissue-records/imported-files (getImportedFiles) · GET /api/tissue-records/alerts (getValidationAlerts) · GET /api/tissue-records/alerts-comments (getDuplicateCommentAlerts) · GET /api/tissue-records/export-alerts (exportAlertsToExcel) · GET /api/tissue-records/export-alerts-comments (exportCommentAlertsToExcel) · DELETE /api/tissue-records/deduplicate (removeDuplicates) · DELETE /api/tissue-records/fix-69-files (fixRetroactiveDuplicates)
- **TissueSecureUploadController**: POST /api/tissue-secure-upload/import/{pilotId} (importSecureData) · GET /api/tissue-secure-upload/logs (getImportLogs) · PUT /api/tissue-secure-upload/reorder (reorderFiles)
- **UserController**: GET /api/users/pilots (getPilots) · GET /api/users/{id} (getUserById) · PATCH /api/users/{id}/toggle-status (toggleUserStatus) · PATCH /api/users/{id}/reset-password (resetPassword) · PATCH /api/users/{id}/permissions (updatePermissions)
- **VentilationController**: POST /api/ventilation/import (importVentilation) · GET /api/ventilation/data (getVentilationData) · DELETE /api/ventilation/purge (purgeVentilationData)
- **WorkflowTemplateController**: ANY /api/templates (js) · GET / (getTemplates) · POST / (create)

### Front routes
- pages: `/` · `/admin/audit` · `/admin/check` · `/admin/data` · `/admin/eps-tracer` · `/admin/export` · `/admin/kanban` · `/admin/live-board` · `/admin/stats` · `/admin/strategic` · `/admin/tasks` · `/admin/templates` · `/admin/users` · `/import` · `/login` · `/pilot/api` · `/pilot/board` · `/pilot/contestation` · `/pilot/facture` · `/pilot/history` · `/pilot/home` · `/pilot/kanban` · `/pilot/parametrage` · `/pilot/recorde` · `/pilot/tissue-records` · `/pilot/ventilation` · `/portal`

### Data models
BytelIntervention, BytelSyncEtat, Batch, FieldDefinition, PilotRecord, PointLog, RecordImportLog, Task, TissueRecord, User, VentilationData, WorkflowTemplate

## Structure
```
KyntusOS-F/
  .github/workflows/ (1 files omitted)
  Workflow/
    src/
      main/
        java/com/kyntus/Workflow/
          bytel/
            controller/
              BytelDiagController.java [sig]
              BytelLocaliserController.java [sig]
              BytelApiController.java [omitted]
            model/ (4 files omitted)
            repository/ (3 files omitted)
            service/ (7 files omitted)
          config/
            ApiExceptionHandler.java [sig]
            CorsConfig.java [omitted]
            DatabaseInitializer.java [omitted]
            SecurityConfig.java [omitted]
            WebSocketConfig.java [omitted]
          controller/
            facture/ (1 files omitted)
            AdminController.java [sig]
            AuthController.java [sig]
            ChatController.java [sig]
            ContestationController.java [sig]
            DispatchController.java [sig]
            ExportController.java [sig]
            HealthController.java [sig]
            ImportController.java [sig]
            ParametrageController.java [sig]
            PilotEquipeController.java [sig]
            PilotSecureUploadController.java [sig]
            RescueController.java [sig]
            TaskAndTemplateAdminController.java [sig]
            TaskController.java [sig]
            TissueEquipeController.java [sig]
            TissueSecureUploadController.java [sig]
            UserController.java [sig]
            VentilationController.java [sig]
            WorkflowTemplateController.java [sig]
            PilotRecordController.java [omitted]
            StatsController.java [omitted]
            TissueRecordController.java [omitted]
          dto/ (8 files omitted)
          model/ (12 files omitted)
          repository/ (8 files omitted)
          service/ (31 files omitted)
          WorkflowApplication.java
          DataSeeder.java [omitted]
        resources/ (1 files omitted)
      test/java/com/kyntus/Workflow/ (1 files omitted)
    Dockerfile [omitted]
    pom.xml [omitted]
  frontend/
    src/
      app/
        admin/ (31 files omitted)
        import/ (2 files omitted)
        login/ (2 files omitted)
        pilot/
          api/
            components/
              NexusModal.tsx [sig]
              … +5 files omitted
            lib/
              apiUtils.ts [sig]
            page.tsx [omitted]
          board/ (19 files omitted)
          contestation/ (2 files omitted)
          facture/ (2 files omitted)
          history/ (2 files omitted)
          home/ (3 files omitted)
          kanban/ (4 files omitted)
          parametrage/ (1 files omitted)
          recorde/ (5 files omitted)
          tissue-records/ (5 files omitted)
          ventilation/ (2 files omitted)
          PilotLayout.module.css [omitted]
          layout.tsx [omitted]
        portal/ (2 files omitted)
        layout.tsx [sig]
        page.tsx [sig]
        globals.css [omitted]
        page.module.css [omitted]
      components/
        3d/ (4 files omitted)
        features/ (6 files omitted)
        kx/
          index.tsx [sig]
          Kx.module.css [omitted]
        layout/ (7 files omitted)
        ui/ (10 files omitted)
      context/ (1 files omitted)
      lib/ (1 files omitted)
      types/ (1 files omitted)
    … +5 files omitted
  AGENTS.md [omitted]
  MAINTENANCE.md [omitted]
  docker-compose.yml [omitted]
```

## Files

### Workflow/src/main/java/com/kyntus/Workflow/WorkflowApplication.java
```java
@SpringBootApplication
public class WorkflowApplication {

	public static void main(String[] args) {
		SpringApplication.run(WorkflowApplication.class, args);
	}

}
```

### Workflow/src/main/java/com/kyntus/Workflow/bytel/controller/BytelDiagController.java · signatures only
```java
@RestController
@RequestMapping("/api/bytel")
public class BytelDiagController {

    @Value("${bytel.dashboard.url:http://10.10.10.25:8117/api/dashboard/interventions}")
    private String dashboardUrl;

    @GetMapping("/diag")
    public ResponseEntity<Map<String, Object>> diag(
            @RequestParam(defaultValue = "2026_M01") String period,
            @RequestParam(defaultValue = "1") int size) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/bytel/controller/BytelLocaliserController.java · signatures only
```java
@RestController
@RequestMapping("/api/bytel")
public class BytelLocaliserController {

    private final ObjectMapper mapper;
    private final RestClient restClient;

    @Value("${bytel.dashboard.url:http://10.10.10.25:8117/api/dashboard/interventions}")
    private String dashboardUrl;

    @Value("${bytel.dashboard.page-size:500}")
    private int pageSize;

    public BytelLocaliserController(ObjectMapper mapper) { … }

    public record LocaliserRequest(List<String> epsList, String eps, List<String> periodes) {}

    @PostMapping("/localiser")
    public ResponseEntity<Map<String, Object>> localiser(@RequestBody LocaliserRequest req) { … }

    private Map<String, Integer> repartition(Map<String, String> trouves) { … }

    private void ajouterTokens(Set<String> cible, String brut) { … }

    private List<String> periodesParDefaut() { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/config/ApiExceptionHandler.java · signatures only
```java
@RestControllerAdvice
public class ApiExceptionHandler {

    private static ResponseEntity<Map<String, Object>> body(HttpStatus status, String message, Throwable t) { … }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> onTooBig(MaxUploadSizeExceededException e) { … }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> onIllegalState(IllegalStateException e) { … }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> onAny(Exception e) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/AdminController.java · signatures only
```java
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final PointLogRepository pointLogRepository;

    public AdminController(TaskRepository taskRepository, UserRepository userRepository, PointLogRepository pointLogRepository) { … }

    @GetMapping("/search")
    public ResponseEntity<?> searchByEps(@RequestParam String eps) { … }

    @PostMapping("/eps-tracer")
    public ResponseEntity<?> traceEps(@RequestBody Map<String, Object> payload) { … }

    @PostMapping("/flag-error/{taskId}")
    public ResponseEntity<?> flagError(@PathVariable Long taskId) { … }

    @PostMapping("/points")
    public ResponseEntity<?> manualPointsAdjustment(@RequestBody Map<String, Object> payload) { … }

    @GetMapping("/points/history/{pilotId}")
    public List<PointLog> getPointsHistory(@PathVariable Long pilotId) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/AuthController.java · signatures only
```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder) { … }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) { … }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequestDto request) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/ChatController.java · signatures only
```java
@Controller
public class ChatController {

    @MessageMapping("/chat.sendMessage")
    @SendTo("/topic/public")
    public ChatMessage sendMessage(@Payload ChatMessage chatMessage) { … }

    @MessageMapping("/chat.addUser")
    @SendTo("/topic/public")
    public ChatMessage addUser(@Payload ChatMessage chatMessage,
                               SimpMessageHeaderAccessor headerAccessor) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/ContestationController.java · signatures only
```java
@RestController
@RequestMapping("/api/contestation")
public class ContestationController {

    private final ContestationService service;
    private final Semaphore slot = new Semaphore(1, true);

    public ContestationController(ContestationService service) { … }

    @PostMapping("/generate")
    public ResponseEntity<byte[]> generate(
            @RequestParam("fichierGlobal") MultipartFile fichierGlobal,
            @RequestParam("fichierFacture") MultipartFile fichierFacture,
            @RequestParam(value = "fichierCa", required = false) MultipartFile fichierCa) { … }

    private static ResponseEntity<byte[]> error(HttpStatus status, String msg) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/DispatchController.java · signatures only
```java
@RestController
@RequestMapping("/api/dispatch")
public class DispatchController {

    private final DispatchService dispatchService;

    public DispatchController(DispatchService dispatchService) { … }

    @PostMapping("/execute")
    public ResponseEntity<Map<String, String>> executeDispatch(@RequestBody DispatchRequestDto request) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/ExportController.java · signatures only
```java
@RestController
@RequestMapping("/api/export")
public class ExportController {

    private final ExcelExportService exportService;

    public ExportController(ExcelExportService exportService) { … }

    @GetMapping("/{templateId}")
    public ResponseEntity<InputStreamResource> exportTemplate(@PathVariable Long templateId) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/HealthController.java · signatures only
```java
@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) { … }

    @GetMapping
    public ResponseEntity<Map<String, Object>> liveness() { … }

    @GetMapping("/db")
    public ResponseEntity<Map<String, Object>> database() { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/ImportController.java · signatures only
```java
@RestController
@RequestMapping("/api/import")
public class ImportController {

    private final ExcelImportService importService;

    public ImportController(ExcelImportService importService) { … }

    @PostMapping("/{templateId}")
    public ResponseEntity<String> uploadExcel(@RequestParam("file") MultipartFile file,
                                              @PathVariable Long templateId) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/ParametrageController.java · signatures only
```java
@RestController
@RequestMapping("/api/parametrage")
public class ParametrageController {

    private final ParametrageMasterService parametrageMasterService;

    public ParametrageController(ParametrageMasterService parametrageMasterService) { … }

    @PostMapping("/process")
    public ResponseEntity<byte[]> processParametrage(@RequestParam("file") MultipartFile file) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/PilotEquipeController.java · signatures only
```java
@RestController
@RequestMapping("/api/equipe-export")
public class PilotEquipeController {

    private final PilotEquipeService pilotEquipeService;

    public PilotEquipeController(PilotEquipeService pilotEquipeService) { … }

    @PostMapping("/track")
    public ResponseEntity<byte[]> exportEquipeTrack(
            @RequestBody List<String> epsList,
            @RequestParam("category") String category,
            @RequestParam(value = "year", required = false) String year,
            @RequestParam(value = "month", required = false) String month) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/PilotSecureUploadController.java · signatures only
```java
@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/secure-upload")
public class PilotSecureUploadController {

    private final PilotSecureImportService pilotSecureImportService;

    public PilotSecureUploadController(PilotSecureImportService pilotSecureImportService) { … }

    @PostMapping("/import/{pilotId}")
    public ResponseEntity<Map<String, Object>> importSecureData(
            @RequestParam("file") MultipartFile file,
            @RequestParam("year") int year,
            @RequestParam("month") int month,
            @RequestParam("category") String category,
            @RequestParam("fileRank") int fileRank,
            @PathVariable Long pilotId) { … }

    @GetMapping("/logs")
    public ResponseEntity<List<RecordImportLog>> getImportLogs(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) { … }

    @PutMapping("/reorder")
    public ResponseEntity<?> reorderFiles(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month,
            @RequestBody List<String> orderedFilenames) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/RescueController.java · signatures only
```java
@RestController
@RequestMapping("/api/rescue")
public class RescueController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public RescueController(UserRepository userRepository, PasswordEncoder passwordEncoder) { … }

    @GetMapping("/admin")
    public String createRescueAdmin() { … }

    @GetMapping("/pilot")
    public String createRescuePilot() { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/TaskAndTemplateAdminController.java · signatures only
```java
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class TaskAndTemplateAdminController {

    private final JdbcTemplate jdbcTemplate;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final WorkflowTemplateRepository workflowTemplateRepository;

    public TaskAndTemplateAdminController(
            JdbcTemplate jdbcTemplate,
            TaskRepository taskRepository,
            UserRepository userRepository,
            WorkflowTemplateRepository workflowTemplateRepository
    ) { … }

    @DeleteMapping("/templates/{templateId}")
    @Transactional
    public ResponseEntity<?> deleteTemplate(@PathVariable Long templateId) { … }

    @PatchMapping("/tasks/reassign")
    @Transactional
    public ResponseEntity<?> reassignTasks(@RequestBody Map<String, Object> payload) { … }

    @PatchMapping("/tasks/{taskId}/validate-final")
    @Transactional
    public ResponseEntity<?> validateFinalByAdmin(@PathVariable Long taskId) { … }

    @GetMapping("/tasks/search-eps")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> searchWhoWorkedOnEps(@RequestParam("q") String query) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/TaskController.java · signatures only
```java
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskRepository taskRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public TaskController(TaskRepository taskRepository, SimpMessagingTemplate messagingTemplate) { … }

    @GetMapping
    public List<Task> getTasks(
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Long templateId,
            @RequestParam(required = false) String status
    ) { … }

    @PatchMapping("/{id}/status")
    public Task updateStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) { … }

    @PatchMapping("/{id}/data")
    public Task updateData(@PathVariable Long id, @RequestBody Map<String, Object> payload) { … }

    @GetMapping("/unassigned")
    public List<Task> getUnassignedTasks() { … }

    @GetMapping("/unassigned/{templateId}")
    public List<Task> getUnassignedTasksByTemplate(@PathVariable Long templateId) { … }

    @GetMapping("/columns/{templateId}")
    public List<String> getTemplateColumns(@PathVariable Long templateId) { … }

    @GetMapping("/values/{templateId}/{columnKey}")
    public List<String> getColumnValues(@PathVariable Long templateId, @PathVariable String columnKey) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/TissueEquipeController.java · signatures only
```java
@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/tissue-equipe-export")
public class TissueEquipeController {

    private final TissueEquipeService tissueEquipeService;

    public TissueEquipeController(TissueEquipeService tissueEquipeService) { … }

    @PostMapping("/track")
    public ResponseEntity<byte[]> exportEquipeTrack(
            @RequestBody List<String> epsList,
            @RequestParam("category") String category,
            @RequestParam(value = "year", required = false) String year,
            @RequestParam(value = "month", required = false) String month) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/TissueSecureUploadController.java · signatures only
```java
@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/tissue-secure-upload")
public class TissueSecureUploadController {

    private final TissueSecureImportService tissueSecureImportService;

    public TissueSecureUploadController(TissueSecureImportService tissueSecureImportService) { … }

    @PostMapping("/import/{pilotId}")
    public ResponseEntity<Map<String, Object>> importSecureData(
            @RequestParam("file") MultipartFile file,
            @RequestParam("year") int year,
            @RequestParam("month") int month,
            @RequestParam("category") String category,
            @RequestParam("fileRank") int fileRank,
            @PathVariable Long pilotId) { … }

    @GetMapping("/logs")
    public ResponseEntity<List<RecordImportLog>> getImportLogs(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) { … }

    @PutMapping("/reorder")
    public ResponseEntity<?> reorderFiles(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month,
            @RequestBody List<String> orderedFilenames) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/UserController.java · signatures only
```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder) { … }

    @GetMapping("/pilots")
    public List<User> getPilots() { … }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) { … }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long id) { … }

    @PatchMapping("/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable Long id, @RequestBody Map<String, String> payload) { … }

    @PatchMapping("/{id}/permissions")
    public ResponseEntity<?> updatePermissions(@PathVariable Long id, @RequestBody Map<String, Boolean> newPermissions) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/VentilationController.java · signatures only
```java
@RestController
@RequestMapping("/api/ventilation")
public class VentilationController {

    private final VentilationMasterService ventilationMasterService;

    public VentilationController(VentilationMasterService ventilationMasterService) { … }

    @PostMapping("/import")
    public ResponseEntity<?> importVentilation(
            @RequestParam("file") MultipartFile file,
            @RequestParam("year") int year,
            @RequestParam("month") int month) { … }

    @GetMapping("/data")
    public ResponseEntity<?> getVentilationData(@RequestParam("year") int year, @RequestParam("month") int month) { … }

    @DeleteMapping("/purge")
    public ResponseEntity<?> purgeVentilationData(@RequestParam("year") int year, @RequestParam("month") int month) { … }
}
```

### Workflow/src/main/java/com/kyntus/Workflow/controller/WorkflowTemplateController.java · signatures only
```java
@RestController
@RequestMapping("/api/templates")
public class WorkflowTemplateController {

    private final WorkflowTemplateService templateService;

    public WorkflowTemplateController(WorkflowTemplateService templateService) { … }

    @GetMapping
    public ResponseEntity<List<WorkflowTemplate>> getTemplates(@RequestParam(required = false) Long userId) { … }

    @PostMapping
    public ResponseEntity<WorkflowTemplate> create(@RequestBody WorkflowTemplateDto dto) { … }
}
```

### frontend/src/app/layout.tsx · signatures only
```tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { AuthProvider } from "@/context/AuthContext";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "Kyntus OS",
  description: "Système de pilotage opérationnel Kyntus",
};

export const viewport: Viewport = {
  themeColor: "#f5f9ff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { … }
```

### frontend/src/app/page.tsx · signatures only
```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Clock, Zap, CheckCircle2, ShieldCheck, ChevronDown, Layers, Loader2, Wifi, WifiOff } from "lucide-react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import AuthGuard from "@/components/layout/AuthGuard";
import { KxHeader, KxStats, KxStat, KxCount, KxCard, KxEmpty } from "@/components/kx";
import { apiJsonOr } from "@/lib/api";
import styles from "./page.module.css";

type Project = { templateId: number; templateName: string; totalTasks: number; progress: number; countActive: number; countValid: number };
type Pilot = { pilotId: number; pilotName: string; completionRate: number; todoCount: number; inProgressCount: number; doneCount: number; validCount: number };
type Dashboard = { global?: { totalToDo?: number; totalInProgress?: number; totalDone?: number; totalValid?: number }; projects?: Project[] };

const STAGES = [
  { key: "totalToDo", label: "À faire", color: "#cbd5e1" },
  { key: "totalInProgress", label: "En cours", color: "#93c5fd" },
  { key: "totalDone", label: "Terminées", color: "#3b82f6" },
  { key: "totalValid", label: "Validées", color: "#1e40af" },
] as const;

export default function CommandPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pilots, setPilots] = useState<Record<number, Pilot[]>>({});
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const fetchPilots = useCallback(async (id: number) => { … }, []);

  const fetchDashboard = useCallback(async () => { … }, []);

  useEffect(() => { … }, [fetchDashboard]);

  useEffect(() => { … }, [fetchDashboard]);

  useEffect(() => { … }, [lastUpdate, expandedId, fetchPilots]);

  const toggle = (id: number) => { … };

  const g = data?.global || {};
  const totals = STAGES.map((s) => ( … ));
  const sum = totals.reduce((a, b) => a + b.value, 0);
  const projects = data?.projects || [];

  return (
    <AuthGuard>
      <main className="kx-page">
        <KxHeader
          icon={LayoutGrid}
          eyebrow="Administration"
          title={<>Centre de <em>commande</em></>}
          subtitle="Vue en direct de toutes les opérations, projet par projet."
          actions={
            <span className={`${styles.live} ${connected ? styles.liveOn : ""}`}>
              {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {connected ? "Temps réel" : "Reconnexion…"}
              {lastUpdate && <small>· {lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</small>}
            </span>
          }
        />

        <KxStats>
          <KxStat icon={Clock} label="À faire" value={loading ? "—" : <KxCount value={totals[0].value} />} tone="warn" />
          <KxStat icon={Zap} label="En cours" value={loading ? "—" : <KxCount value={totals[1].value} />} tone="sky" delay={0.05} />
          <KxStat icon={CheckCircle2} label="Terminées" value={loading ? "—" : <KxCount value={totals[2].value} />} delay={0.1} />
          <KxStat icon={ShieldCheck} label="Validées" value={loading ? "—" : <KxCount value={totals[3].value} />} tone="ok" delay={0.15} />
        </KxStats>

        {}
        <KxCard title="Répartition des tâches" icon={Layers} count={sum.toLocaleString("fr-FR")}>
          {sum === 0 ? (
            <p className={styles.muted}>{loading ? "Chargement…" : "Aucune tâche pour le moment."}</p>
          ) : (
            <>
              <div className={styles.stack} role="img" aria-label={totals.map((t) => `${t.label} ${t.value}`).join(", ")}>
                {totals.filter((t) => t.value > 0).map((t) => ( … )} %
                      </span>
                    )}
                  </motion.span>
                ))}
              </div>
              <ul className={styles.legend}>
                {totals.map((t) => ( … ))}
              </ul>
            </>
          )}
        </KxCard>

        {}
        <section className={styles.projects}>
          <h2 className={styles.sectionTitle}>Opérations actives <span>{projects.length}</span></h2>
          {loading && Array.from({ length: 3 }).map((_, i) => <div key={i} className={`kx-skeleton ${styles.skel}`} />)}
          {!loading && projects.length === 0 && (
            <KxCard><KxEmpty icon={Layers} title="Aucune opération active"><span>Les projets apparaîtront ici dès qu&apos;une tâche sera dispatchée.</span></KxEmpty></KxCard>
          )}
          {projects.map((p, i) => { … })}
        </section>
      </main>
    </AuthGuard>
  );
}
```

### frontend/src/app/pilot/api/components/NexusModal.tsx · signatures only
```tsx
"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  ouvert: boolean;
  onClose: () => void;
  titre: React.ReactNode;
  sousTitre?: React.ReactNode;
  icone?: React.ReactNode;
  accent?: string;
  largeur?: number;
  verrouille?: boolean;
  children: React.ReactNode;
  pied?: React.ReactNode;
}

export default function NexusModal({
  ouvert,
  onClose,
  titre,
  sousTitre,
  icone,
  accent = "#2563eb",
  largeur = 740,
  verrouille,
  children,
  pied,
}: Props) { … }
```

### frontend/src/app/pilot/api/lib/apiUtils.ts · signatures only
```ts
export const ETAT_ACTIONNABLE = "EN_ATTENTE_VALIDATION_PARTENAIRE";

export const ETAT_COLORS: Record<string, string> = {
  EN_ATTENTE_VALIDATION_PARTENAIRE: "#d97706",
  EN_ATTENTE_VALIDATION_BYTEL: "#2563eb",
  EN_ATTENTE_ANALYSE_PHOTOS: "#0284c7",
  EN_ATTENTE_VALIDATION_ANALYSE_PHOTOS: "#1d4ed8",
  VALIDEE: "#059669",
  INCONNU: "#64748b",
};
export const couleurEtat = (e?: string | null) => ( … ) || "#334e7b";

export const TYPES_RACCORDEMENT = ["EXISTANTE", "BRASSAGE_PM", "INTERIEUR", "CHAMBRE", "AERIEN", "FACADE"];
export const TYPES_PAR_QUALIF: Record<string, string[]> = {
  QualificationRaccordement: ["RACCORDEMENT", "BRASSAGE_PM", "PLP", "NOK"],
  QualificationSAV: ["SAV_STD", "SAV_MC", "SAV_SC", "SAV_REPRISE", "NOK"],
  QualificationReseau: ["AUDITS", "DESATURATION", "REMISE_EN_ETAT", "REPRISE_JARRETIERAGE", "EXPERTISES", "SOUDURE_ET_POSES_DE_CORPS_DE_TRAVERSES"],
};
export const ELEMENTS_PAR_QUALIF: Record<string, string[]> = {
  QualificationRaccordement: ["INSTALLATION", "MES", "MATERIEL", "SUPPORT", "LOGISTIQUE", "DEPLACEMENT", "GOULOTTE"],
  QualificationSAV: ["INSTALLATION", "SUPPORT", "DEPLACEMENT", "JARRETIERES"],
  QualificationReseau: ["INSTALLATION", "MATERIEL", "JARRETIERES", "DEPLACEMENT"],
};
export const ELEMENTS_TOUS = ["INSTALLATION", "MES", "MATERIEL", "SUPPORT", "LOGISTIQUE", "DEPLACEMENT", "GOULOTTE", "JARRETIERES"];

export const SECTEURS = [
  { value: "", label: "SECTEUR : TOUS" },
  { value: "QualificationRaccordement", label: "SECTEUR : RACC" },
  { value: "QualificationSAV", label: "SECTEUR : SAV" },
  { value: "QualificationReseau", label: "SECTEUR : RESEAU" },
];
export const libelleSecteur = (q?: string | null) =>
  !q ? "TOUS" : q === "QualificationRaccordement" ? "RACC" : q === "QualificationSAV" ? "SAV" : q === "QualificationReseau" ? "RESEAU" : q.replace("Qualification", "");

export const VERSIONS_OPTIONS = [
  { value: "", label: "Toutes versions" },
  { value: "1", label: "V1 seule" },
  { value: "2", label: "2 versions" },
  { value: "3", label: "3 versions" },
  { value: "2+", label: "2 versions et +" },
  { value: "3+", label: "3 versions et +" },
  { value: "5+", label: "5 versions et +" },
];

export const elementsDe = (v: any): Record<string, number> => { … };
export const totalElements = (el: Record<string, number>) =>
  Object.values(el || {}).reduce((a, b) => a + (Number(b) || 0), 0);

export const fmtMontant = (m?: number | null) =>
  m === null || m === undefined ? "-" : `${Number(m).toFixed(2).replace(".", ",")} €`;

export const fmtDate = (d?: string | null) => { … };

export const parserListe = (t: string) =>
  Array.from(new Set((t || "").split(/[\s,;|]+/).map(x => x.trim().replace(/["']/g, "").toUpperCase()).filter(Boolean)));

export const telechargerBlob = (blob: Blob, nom: string) => { … };

export const telechargerUrl = (url: string, nom: string) => { … };

export const auteurCourant = () => { … };
```

### frontend/src/components/kx/index.tsx · signatures only
```tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  UploadCloud, Loader2, CheckCircle2, AlertTriangle, Info, Search, ChevronLeft, ChevronRight,
  Inbox, type LucideIcon,
} from "lucide-react";
import s from "./Kx.module.css";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function trackGlow(e: React.PointerEvent<HTMLElement>) { … }

export function KxHeader({
  icon: Icon, eyebrow, title, subtitle, actions,
}: { icon: LucideIcon; eyebrow?: string; title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) { … }

export function KxCard({
  children, title, icon: Icon, count, actions, className, pad = true, style,
}: {
  children: React.ReactNode; title?: React.ReactNode; icon?: LucideIcon; count?: React.ReactNode;
  actions?: React.ReactNode; className?: string; pad?: boolean; style?: React.CSSProperties;
}) { … }

export function KxDropzone({
  onFile, busy, disabled, title = "Glissez votre fichier Excel ici", hint = "ou cliquez pour parcourir · .xlsx, .xls, .csv",
  busyTitle = "Traitement en cours…", busyHint = "Merci de patienter", accept = ".xlsx,.xls,.csv", icon: Icon = UploadCloud,
}: {
  onFile: (f: File) => void; busy?: boolean; disabled?: boolean; title?: string; hint?: string;
  busyTitle?: string; busyHint?: string; accept?: string; icon?: LucideIcon;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const locked = busy || disabled;
  return (
    <button
      type="button"
      onPointerMove={trackGlow}
      className={cx(s.drop, over && s.dropActive, busy && s.dropBusy, disabled && !busy && s.dropDisabled)}
      onClick={() => !locked && input.current?.click()}
      onDragOver={(e) => { … }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { … }}
      aria-busy={busy}
      disabled={disabled && !busy}
    >
      <input
        ref={input} type="file" accept={accept} hidden
        onChange={(e) => { … }}
      />
      <span className={s.dropIcon}>{busy ? <Loader2 size={30} className="kx-spin" /> : <Icon size={30} />}</span>
      <span className={s.dropTitle}>{busy ? busyTitle : over ? "Relâchez pour importer" : title}</span>
      <span className={s.dropHint}>{busy ? busyHint : hint}</span>
      {busy && <span className={s.dropBar} />}
    </button>
  );
}

export function KxAlert({ tone, children, icon }: { tone: "ok" | "bad" | "info"; children: React.ReactNode; icon?: React.ReactNode }) {
  const I = tone === "ok" ? CheckCircle2 : tone === "bad" ? AlertTriangle : Info;
  return (
    <div className={cx(s.alert, s[`alert_${tone}`])} role={tone === "bad" ? "alert" : "status"}>
      <span className={s.alertIcon}>{icon ?? <I size={19} />}</span>
      <div className={s.alertBody}>{children}</div>
    </div>
  );
}

export function KxCount({ value, suffix = "", decimals = 0 }: { value: number; suffix?: string; decimals?: number }) { … }

export function KxStats({ children }: { children: React.ReactNode }) { … }

export function KxStat({
  icon: Icon, label, value, tone, delay = 0,
}: { icon: LucideIcon; label: string; value: React.ReactNode; tone?: "ok" | "bad" | "warn" | "sky"; delay?: number }) { … }

export function KxEmpty({ icon: Icon = Inbox, title, children }: { icon?: LucideIcon; title: string; children?: React.ReactNode }) { … }

export function KxTable({
  rows, columns, pageSize = 50, title, icon, searchPlaceholder = "Rechercher une valeur…", render,
}: {
  rows: Record<string, unknown>[]; columns: string[]; pageSize?: number; title?: React.ReactNode; icon?: LucideIcon;
  searchPlaceholder?: string; render?: (col: string, value: unknown, row: Record<string, unknown>) => React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => { … }, [rows, columns, q]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const cur = Math.min(page, pages);
  const slice = filtered.slice((cur - 1) * pageSize, cur * pageSize);

  const cell = (c: string, v: unknown, r: Record<string, unknown>) => { … };

  return (
    <KxCard title={title} icon={icon} count={filtered.length.toLocaleString("fr-FR")}
      actions={
        <label className={s.search}>
          <Search size={15} />
          <span className={s.srOnly}>Rechercher</span>
          <input value={q} onChange={(e) => { … }} placeholder={searchPlaceholder} />
        </label>
      }
    >
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {slice.map((r, i) => ( … )}
            {slice.length === 0 && (
              <tr><td colSpan={columns.length} className={s.empty}>Aucune ligne ne correspond à « {q} ».</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className={s.pager}>
          <span>Page <b>{cur}</b> sur <b>{pages}</b></span>
          <div className={s.pagerBtns}>
            <button type="button" className={s.pageBtn} disabled={cur === 1} onClick={() => setPage(cur - 1)}><ChevronLeft size={15} /> Précédent</button>
            <button type="button" className={s.pageBtn} disabled={cur === pages} onClick={() => setPage(cur + 1)}>Suivant <ChevronRight size={15} /></button>
          </div>
        </div>
      )}
    </KxCard>
  );
}
```
## Not included
- omitted (budget): 219 files — see `[omitted]` in Structure
