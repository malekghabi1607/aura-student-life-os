# syntax=docker/dockerfile:1
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /workspace
RUN apt-get update && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw
RUN ./mvnw -B -ntp dependency:go-offline
COPY src/ src/
# Tests use H2 and mock external services; no build-time credentials are needed.
RUN ./mvnw -B -ntp package

FROM eclipse-temurin:17-jre-jammy AS runtime-base
RUN apt-get update && apt-get install -y --no-install-recommends curl fontconfig fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 aura \
    && useradd --uid 10001 --gid aura --no-create-home --shell /usr/sbin/nologin aura
WORKDIR /app
ENV SPRING_PROFILES_ACTIVE=prod \
    MANAGEMENT_SERVER_PORT=8081
USER 10001:10001
EXPOSE 8080 8081
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
    CMD curl --fail --silent --max-time 4 http://127.0.0.1:8081/actuator/health/readiness || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

# CI receives only the JAR already tested by the backend job, never source/secrets.
FROM runtime-base AS ci-runtime
COPY --chown=aura:aura finance-tracker-api-1.0.0.jar /app/app.jar

# Keep the default local/Compose build self-contained, including its tests.
FROM runtime-base AS runtime
COPY --from=build --chown=aura:aura /workspace/target/finance-tracker-api-1.0.0.jar /app/app.jar
