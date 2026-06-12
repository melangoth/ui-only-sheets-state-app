FROM gradle:8.13-jdk21-alpine AS build

WORKDIR /workspace

COPY build.gradle settings.gradle ./
COPY src ./src

RUN gradle --no-daemon clean bootJar

FROM eclipse-temurin:21-jre

WORKDIR /app

RUN groupadd --system app && useradd --system --gid app app

COPY --from=build /workspace/build/libs/app.jar app.jar

USER app

EXPOSE 8080

ENV JAVA_TOOL_OPTIONS="-Dio.grpc.netty.shaded.io.netty.handler.ssl.noOpenSsl=true"

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
