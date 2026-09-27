CREATE TABLE "collections" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerName" TEXT NOT NULL CHECK(length(trim("customerName")) > 0),
    "customerNameSearch" TEXT NOT NULL CHECK(length(trim("customerNameSearch")) > 0),
    "address" TEXT NOT NULL CHECK(length(trim("address")) > 0),
    "packageCount" INTEGER NOT NULL CHECK(typeof("packageCount") = 'integer' AND "packageCount" > 0),
    "priority" TEXT NOT NULL CHECK("priority" IN ('LOW', 'NORMAL', 'HIGH')),
    "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK("status" IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELED')),
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
