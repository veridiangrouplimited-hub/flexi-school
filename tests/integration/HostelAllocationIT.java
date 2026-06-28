package com.flexischool.tests.integration;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

@Testcontainers
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class HostelAllocationIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES =
        new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("flexischool_test")
            .withUsername("test")
            .withPassword("test");

    private static String adminToken;
    private static String tenantId;
    private static String dayStudentId;
    private static String boarderStudentId;
    private static String bedId;

    @BeforeAll
    static void setUp() {
        RestAssured.baseURI = "http://localhost";
        RestAssured.port    = Integer.parseInt(System.getProperty("api.port", "4000"));

        // Seed a HYBRID tenant with one bed, one DAY student, one BOARDER student
        var seed = given()
            .contentType(ContentType.JSON)
            .body("""
                {
                  "tenantName":   "Test Secondary School",
                  "boardingType": "HYBRID",
                  "level":        "SECONDARY"
                }
                """)
            .post("/test-utils/seed-tenant")
            .then()
            .statusCode(201)
            .extract().jsonPath();

        tenantId          = seed.getString("tenantId");
        adminToken        = seed.getString("adminToken");
        dayStudentId      = seed.getString("dayStudentId");
        boarderStudentId  = seed.getString("boarderStudentId");
        bedId             = seed.getString("bedId");
    }

    // ── Test 1: DAY student is rejected ──────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("DAY student cannot be assigned to a hostel bed → 422 BOARDERS_ONLY")
    void dayStudentCannotBeAllocatedToBed() {
        given()
            .header("Authorization", "Bearer " + adminToken)
            .header("X-Tenant-ID",   tenantId)
            .contentType(ContentType.JSON)
            .body("""
                {
                  "studentId": "%s",
                  "bedId":     "%s"
                }
                """.formatted(dayStudentId, bedId))
        .when()
            .post("/api/hostel/allocations")
        .then()
            .statusCode(422)
            .body("code",    equalTo("BOARDERS_ONLY"))
            .body("message", containsStringIgnoringCase("boarding status"));
    }

    // ── Test 2: BOARDER student succeeds ─────────────────────────────────────

    @Test
    @Order(2)
    @DisplayName("BOARDER student is successfully allocated to a vacant bed → 201")
    void boarderStudentCanBeAllocatedToBed() {
        given()
            .header("Authorization", "Bearer " + adminToken)
            .header("X-Tenant-ID",   tenantId)
            .contentType(ContentType.JSON)
            .body("""
                {
                  "studentId": "%s",
                  "bedId":     "%s"
                }
                """.formatted(boarderStudentId, bedId))
        .when()
            .post("/api/hostel/allocations")
        .then()
            .statusCode(201)
            .body("allocation.studentId", equalTo(boarderStudentId))
            .body("allocation.bedId",     equalTo(bedId));
    }

    // ── Test 3: Duplicate allocation is blocked ───────────────────────────────

    @Test
    @Order(3)
    @DisplayName("Duplicate allocation for same session is rejected → 409 ALREADY_ALLOCATED")
    void duplicateAllocationRejected() {
        given()
            .header("Authorization", "Bearer " + adminToken)
            .header("X-Tenant-ID",   tenantId)
            .contentType(ContentType.JSON)
            .body("""
                {
                  "studentId": "%s",
                  "bedId":     "%s"
                }
                """.formatted(boarderStudentId, bedId))
        .when()
            .post("/api/hostel/allocations")
        .then()
            .statusCode(409)
            .body("code", equalTo("ALREADY_ALLOCATED"));
    }

    // ── Test 4: Feature flag blocks DAY_ONLY tenant ───────────────────────────

    @Test
    @Order(4)
    @DisplayName("Hostel endpoint returns 403 for DAY_ONLY tenant → FEATURE_DISABLED")
    void hostelEndpointBlockedForDayOnlyTenant() {
        var dayOnly = given()
            .contentType(ContentType.JSON)
            .body("""
                {
                  "tenantName":   "Sunrise Day School",
                  "boardingType": "DAY_ONLY",
                  "level":        "PRIMARY"
                }
                """)
            .post("/test-utils/seed-tenant")
            .then().statusCode(201).extract().jsonPath();

        given()
            .header("Authorization", "Bearer " + dayOnly.getString("adminToken"))
            .header("X-Tenant-ID",   dayOnly.getString("tenantId"))
        .when()
            .get("/api/hostel/dormitories")
        .then()
            .statusCode(403)
            .body("code", equalTo("FEATURE_DISABLED"));
    }

    // ── Test 5: Cross-tenant data isolation ───────────────────────────────────

    @Test
    @Order(5)
    @DisplayName("Tenant A admin cannot access Tenant B data → 401 TENANT_MISMATCH")
    void crossTenantDataLeakageBlocked() {
        var tenantB = given()
            .contentType(ContentType.JSON)
            .body("""
                {
                  "tenantName":   "School B",
                  "boardingType": "HYBRID",
                  "level":        "SECONDARY"
                }
                """)
            .post("/test-utils/seed-tenant")
            .then().statusCode(201).extract().jsonPath();

        // Tenant A token + Tenant B scope header must be rejected
        given()
            .header("Authorization", "Bearer " + adminToken)           // Tenant A JWT
            .header("X-Tenant-ID",   tenantB.getString("tenantId"))   // Tenant B scope
        .when()
            .get("/api/students")
        .then()
            .statusCode(401)
            .body("code", equalTo("TENANT_MISMATCH"));
    }

    // ── Test 6: Suspended tenant cannot write ─────────────────────────────────

    @Test
    @Order(6)
    @DisplayName("SUSPENDED tenant write requests are blocked → 403 ACCOUNT_SUSPENDED")
    void suspendedTenantWriteBlocked() {
        var suspended = given()
            .contentType(ContentType.JSON)
            .body("""
                {
                  "tenantName":   "Suspended School",
                  "boardingType": "HYBRID",
                  "level":        "SECONDARY",
                  "subStatus":    "SUSPENDED"
                }
                """)
            .post("/test-utils/seed-tenant")
            .then().statusCode(201).extract().jsonPath();

        given()
            .header("Authorization", "Bearer " + suspended.getString("adminToken"))
            .header("X-Tenant-ID",   suspended.getString("tenantId"))
            .contentType(ContentType.JSON)
            .body("{}")
        .when()
            .post("/api/students")
        .then()
            .statusCode(403)
            .body("code", equalTo("ACCOUNT_SUSPENDED"));
    }
}
