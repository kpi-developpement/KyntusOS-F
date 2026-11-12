# --- Stage 1: Build (B Image Maven officiel) ---
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# 1. N-copiw ghir l'pom.xml f l-lowel
COPY pom.xml .

# 2. N-telechargiw la majorite des dependances bach n-creyiw l'cache
RUN mvn dependency:go-offline -B

# 3. N-copiw l'code source
COPY src ./src

# 4. Mse7na '-o' bach Maven y-qder y-jib dakchi li naqess
RUN mvn clean package -DskipTests

# --- Stage 2: Run (Lightweight Java) ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Njibou .jar li tssayb f Stage 1
COPY --from=builder /app/target/*.jar app.jar

# N-aligniw l'Port m3a Spring Boot (8082)
EXPOSE 8082

# ============================================================================
# JVM OPTIONS
#  - MaxRAMPercentage : 7ta t9ad ras-ha m3a `mem_limit` dyal Docker (ma-b9ach
#    -Xmx fixe li kan kay-khelli l'JVM t-tleb 4g 7ta ila l'conteneur 3endo 2g).
#  - ExitOnOutOfMemoryError : L-MOUCHKIL L-KBIR. Bla hadi, mnin kat-tle3
#    OutOfMemoryError f wst l-facture, l'JVM kat-b9a 7ayya w m-blokiya
#    (GC thrashing) : Spring ma-kay-mout-ch, w `restart: always` ma-kay-khdem-ch,
#    w kolchi (7ta /api/auth/login) kay-wlli 500 7ta t-redeployi b l-yedd.
#    B hadi : l'process kay-mout nichan -> Docker kay-redemmrih wa7do.
#  - Xss512k : ghi bach n-weffrou RAM 3la les threads dyal Tomcat.
# ============================================================================
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:InitialRAMPercentage=25 -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError -Xss512k -Djava.awt.headless=true"

# 'exec' bach java y-wlli PID 1 w y-sme3 SIGTERM dyal docker stop
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
