FROM gradle:8.13-jdk21-alpine AS build

WORKDIR /workspace

COPY build.gradle settings.gradle ./
COPY src ./src

RUN gradle --no-daemon clean bootJar

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY --from=build /workspace/build/libs/app.jar app.jar

USER app

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
