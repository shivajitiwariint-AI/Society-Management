-- CreateTable
CREATE TABLE `Resident` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `societyId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NULL,
    `name` VARCHAR(200) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(254) NULL,
    `residentType` ENUM('OWNER', 'TENANT', 'FAMILY') NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `documentType` VARCHAR(50) NULL,
    `documentNumber` VARCHAR(80) NULL,
    `documentStatus` ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Resident_userId_key`(`userId`),
    INDEX `Resident_companyId_societyId_residentType_idx`(`companyId`, `societyId`, `residentType`),
    INDEX `Resident_companyId_societyId_status_idx`(`companyId`, `societyId`, `status`),
    INDEX `Resident_companyId_phone_idx`(`companyId`, `phone`),
    UNIQUE INDEX `Resident_id_companyId_key`(`id`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ownership` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `societyId` CHAR(36) NOT NULL,
    `flatId` CHAR(36) NOT NULL,
    `residentId` CHAR(36) NOT NULL,
    `fromDate` DATE NOT NULL,
    `toDate` DATE NULL,
    `ownershipShare` DECIMAL(5, 2) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ACTIVE', 'TRANSFERRED', 'ENDED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Ownership_companyId_societyId_flatId_status_idx`(`companyId`, `societyId`, `flatId`, `status`),
    INDEX `Ownership_companyId_residentId_status_idx`(`companyId`, `residentId`, `status`),
    UNIQUE INDEX `Ownership_id_companyId_key`(`id`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tenancy` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `societyId` CHAR(36) NOT NULL,
    `flatId` CHAR(36) NOT NULL,
    `residentId` CHAR(36) NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NULL,
    `monthlyRent` DECIMAL(12, 2) NULL,
    `status` ENUM('ACTIVE', 'ENDED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Tenancy_companyId_societyId_flatId_status_idx`(`companyId`, `societyId`, `flatId`, `status`),
    INDEX `Tenancy_companyId_residentId_status_idx`(`companyId`, `residentId`, `status`),
    UNIQUE INDEX `Tenancy_id_companyId_key`(`id`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FamilyMember` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `societyId` CHAR(36) NOT NULL,
    `residentId` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `relationship` ENUM('SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER') NOT NULL,
    `phone` VARCHAR(20) NULL,
    `dateOfBirth` DATE NULL,
    `documentStatus` ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FamilyMember_companyId_societyId_residentId_idx`(`companyId`, `societyId`, `residentId`),
    UNIQUE INDEX `FamilyMember_id_companyId_key`(`id`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vehicle` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `societyId` CHAR(36) NOT NULL,
    `residentId` CHAR(36) NOT NULL,
    `registrationNumber` VARCHAR(30) NOT NULL,
    `vehicleType` ENUM('CAR', 'TWO_WHEELER', 'COMMERCIAL', 'OTHER') NOT NULL,
    `make` VARCHAR(80) NULL,
    `model` VARCHAR(80) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Vehicle_companyId_societyId_residentId_idx`(`companyId`, `societyId`, `residentId`),
    UNIQUE INDEX `Vehicle_id_companyId_key`(`id`, `companyId`),
    UNIQUE INDEX `Vehicle_companyId_societyId_registrationNumber_key`(`companyId`, `societyId`, `registrationNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Flat_id_companyId_key` ON `Flat`(`id`, `companyId`);

-- AddForeignKey
ALTER TABLE `Flat` ADD CONSTRAINT `Flat_societyId_companyId_fkey` FOREIGN KEY (`societyId`, `companyId`) REFERENCES `Society`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Resident` ADD CONSTRAINT `Resident_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Resident` ADD CONSTRAINT `Resident_societyId_companyId_fkey` FOREIGN KEY (`societyId`, `companyId`) REFERENCES `Society`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ownership` ADD CONSTRAINT `Ownership_flatId_companyId_fkey` FOREIGN KEY (`flatId`, `companyId`) REFERENCES `Flat`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ownership` ADD CONSTRAINT `Ownership_residentId_companyId_fkey` FOREIGN KEY (`residentId`, `companyId`) REFERENCES `Resident`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tenancy` ADD CONSTRAINT `Tenancy_flatId_companyId_fkey` FOREIGN KEY (`flatId`, `companyId`) REFERENCES `Flat`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tenancy` ADD CONSTRAINT `Tenancy_residentId_companyId_fkey` FOREIGN KEY (`residentId`, `companyId`) REFERENCES `Resident`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FamilyMember` ADD CONSTRAINT `FamilyMember_residentId_companyId_fkey` FOREIGN KEY (`residentId`, `companyId`) REFERENCES `Resident`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_residentId_companyId_fkey` FOREIGN KEY (`residentId`, `companyId`) REFERENCES `Resident`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;
