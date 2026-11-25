-- CreateTable
CREATE TABLE `MaintenanceExpense` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `societyId` CHAR(36) NOT NULL,
    `month` DATE NOT NULL,
    `category` VARCHAR(120) NOT NULL,
    `vendorPayee` VARCHAR(200) NULL,
    `voucherRef` VARCHAR(100) NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `remarks` VARCHAR(500) NULL,
    `source` VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    `sourceKey` VARCHAR(160) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MaintenanceExpense_companyId_societyId_month_idx`(`companyId`, `societyId`, `month`),
    INDEX `MaintenanceExpense_companyId_category_month_idx`(`companyId`, `category`, `month`),
    INDEX `MaintenanceExpense_companyId_source_month_idx`(`companyId`, `source`, `month`),
    UNIQUE INDEX `MaintenanceExpense_companyId_societyId_sourceKey_key`(`companyId`, `societyId`, `sourceKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MaintenanceExpense` ADD CONSTRAINT `MaintenanceExpense_societyId_companyId_fkey` FOREIGN KEY (`societyId`, `companyId`) REFERENCES `Society`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;
