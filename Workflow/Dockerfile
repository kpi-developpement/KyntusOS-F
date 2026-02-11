# --- Stage 1: Build (B Image Maven officiel) ---
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# Hna kan copiwy ghir pom.xml bach nstafdo mn cache Docker
COPY pom.xml .
# (Optionnel) T9der dir 'RUN mvn dependency:go-offline' hna bach tserre3 builds jayin

# Copier source code
COPY src ./src

# Build b 'mvn' direct (bla wrapper)
RUN mvn clean package -DskipTests

# --- Stage 2: Run (Lightweight Java) ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Njibou .jar li tssayb f Stage 1
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]