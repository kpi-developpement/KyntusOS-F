# --- Stage 1: Build (B Image Maven officiel) ---
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# 1. N-copiw ghir l'pom.xml f l-lowel
COPY pom.xml .

# 2. N-telechargiw la majorite des dependances bach n-creyiw l'cache
RUN mvn dependency:go-offline -B

# 3. N-copiw l'code source
COPY src ./src

# 4. 🔥 L-FIX HNA: Mse7na '-o' bach Maven y-qder y-jib dakchi li naqess
RUN mvn clean package -DskipTests

# --- Stage 2: Run (Lightweight Java) ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Njibou .jar li tssayb f Stage 1
COPY --from=builder /app/target/*.jar app.jar

# N-aligniw l'Port m3a Spring Boot (8082)
EXPOSE 8082

# L'lancement m3a l'optimisation dyal l'RAM
ENTRYPOINT ["java", "-Xms1g", "-Xmx4g", "-jar", "app.jar"]