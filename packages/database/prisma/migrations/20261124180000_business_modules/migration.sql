-- CreateTable
CREATE TABLE `OperationalRecord` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `societyId` CHAR(36) NOT NULL,
    `moduleKey` VARCHAR(40) NOT NULL,
    `resourceKey` VARCHAR(60) NOT NULL,
    `code` VARCHAR(100) NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` VARCHAR(1000) NULL,
    `status` VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
    `priority` VARCHAR(20) NULL,
    `startAt` DATETIME(3) NULL,
    `endAt` DATETIME(3) NULL,
    `amount` DECIMAL(14, 2) NULL,
    `residentId` CHAR(36) NULL,
    `flatId` CHAR(36) NULL,
    `assigneeUserId` CHAR(36) NULL,
    `metadata` JSON NULL,
    `createdBy` CHAR(36) NULL,
    `updatedBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OperationalRecord_companyId_societyId_moduleKey_resourceKey_idx`(`companyId`, `societyId`, `moduleKey`, `resourceKey`),
    INDEX `OperationalRecord_companyId_moduleKey_status_idx`(`companyId`, `moduleKey`, `status`),
    INDEX `OperationalRecord_companyId_societyId_startAt_idx`(`companyId`, `societyId`, `startAt`),
    UNIQUE INDEX `OperationalRecord_companyId_moduleKey_resourceKey_code_key`(`companyId`, `moduleKey`, `resourceKey`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `societyId` CHAR(36) NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `accountType` VARCHAR(30) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Account_companyId_societyId_accountType_idx`(`companyId`, `societyId`, `accountType`),
    UNIQUE INDEX `Account_id_companyId_key`(`id`, `companyId`),
    UNIQUE INDEX `Account_companyId_societyId_code_key`(`companyId`, `societyId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BillingCharge` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `societyId` CHAR(36) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `chargeType` VARCHAR(30) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `frequency` VARCHAR(30) NOT NULL DEFAULT 'MONTHLY',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BillingCharge_companyId_societyId_isActive_idx`(`companyId`, `societyId`, `isActive`),
    UNIQUE INDEX `BillingCharge_companyId_societyId_code_key`(`companyId`, `societyId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinancialPeriod` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `societyId` CHAR(36) NOT NULL,
    `periodKey` VARCHAR(20) NOT NULL,
    `locked` BOOLEAN NOT NULL DEFAULT false,
    `lockedBy` CHAR(36) NULL,
    `lockedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FinancialPeriod_companyId_societyId_locked_idx`(`companyId`, `societyId`, `locked`),
    UNIQUE INDEX `FinancialPeriod_companyId_societyId_periodKey_key`(`companyId`, `societyId`, `periodKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `societyId` CHAR(36) NOT NULL,
    `invoiceNumber` VARCHAR(40) NOT NULL,
    `residentId` CHAR(36) NULL,
    `flatId` CHAR(36) NULL,
    `issueDate` DATE NOT NULL,
    `dueDate` DATE NOT NULL,
    `periodKey` VARCHAR(20) NULL,
    `totalAmount` DECIMAL(14, 2) NOT NULL,
    `paidAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `notes` VARCHAR(500) NULL,
    `createdBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Invoice_companyId_societyId_status_idx`(`companyId`, `societyId`, `status`),
    INDEX `Invoice_companyId_societyId_dueDate_idx`(`companyId`, `societyId`, `dueDate`),
    UNIQUE INDEX `Invoice_id_companyId_key`(`id`, `companyId`),
    UNIQUE INDEX `Invoice_companyId_societyId_invoiceNumber_key`(`companyId`, `societyId`, `invoiceNumber`),
    UNIQUE INDEX `Invoice_companyId_societyId_residentId_periodKey_key`(`companyId`, `societyId`, `residentId`, `periodKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceItem` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `societyId` CHAR(36) NOT NULL,
    `invoiceId` CHAR(36) NOT NULL,
    `description` VARCHAR(200) NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 1,
    `unitAmount` DECIMAL(14, 2) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `chargeCode` VARCHAR(40) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InvoiceItem_companyId_societyId_invoiceId_idx`(`companyId`, `societyId`, `invoiceId`),
    UNIQUE INDEX `InvoiceItem_id_companyId_key`(`id`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `societyId` CHAR(36) NOT NULL,
    `invoiceId` CHAR(36) NULL,
    `residentId` CHAR(36) NULL,
    `receiptNumber` VARCHAR(40) NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `method` VARCHAR(30) NOT NULL DEFAULT 'OFFLINE',
    `reference` VARCHAR(120) NULL,
    `status` ENUM('PENDING', 'RECORDED', 'APPROVED', 'RECONCILED', 'REFUNDED', 'REVERSED') NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NOT NULL,
    `approvedBy` CHAR(36) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Payment_companyId_societyId_status_idx`(`companyId`, `societyId`, `status`),
    INDEX `Payment_companyId_societyId_paidAt_idx`(`companyId`, `societyId`, `paidAt`),
    UNIQUE INDEX `Payment_id_companyId_key`(`id`, `companyId`),
    UNIQUE INDEX `Payment_companyId_societyId_receiptNumber_key`(`companyId`, `societyId`, `receiptNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Refund` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `societyId` CHAR(36) NOT NULL,
    `paymentId` CHAR(36) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `approvedBy` CHAR(36) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Refund_companyId_societyId_status_idx`(`companyId`, `societyId`, `status`),
    UNIQUE INDEX `Refund_id_companyId_key`(`id`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JournalEntry` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `societyId` CHAR(36) NOT NULL,
    `entryNumber` VARCHAR(40) NOT NULL,
    `entryDate` DATE NOT NULL,
    `description` VARCHAR(300) NOT NULL,
    `periodKey` VARCHAR(20) NULL,
    `status` ENUM('DRAFT', 'POSTED', 'REVERSED') NOT NULL DEFAULT 'DRAFT',
    `reversalOf` CHAR(36) NULL,
    `createdBy` CHAR(36) NULL,
    `postedBy` CHAR(36) NULL,
    `postedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JournalEntry_companyId_societyId_status_idx`(`companyId`, `societyId`, `status`),
    INDEX `JournalEntry_companyId_societyId_entryDate_idx`(`companyId`, `societyId`, `entryDate`),
    UNIQUE INDEX `JournalEntry_id_companyId_key`(`id`, `companyId`),
    UNIQUE INDEX `JournalEntry_companyId_societyId_entryNumber_key`(`companyId`, `societyId`, `entryNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JournalLine` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `societyId` CHAR(36) NOT NULL,
    `journalEntryId` CHAR(36) NOT NULL,
    `accountId` CHAR(36) NOT NULL,
    `debit` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `credit` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `narrative` VARCHAR(200) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `JournalLine_companyId_societyId_journalEntryId_idx`(`companyId`, `societyId`, `journalEntryId`),
    INDEX `JournalLine_companyId_societyId_accountId_idx`(`companyId`, `societyId`, `accountId`),
    UNIQUE INDEX `JournalLine_id_companyId_key`(`id`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OperationalRecord` ADD CONSTRAINT `OperationalRecord_societyId_companyId_fkey` FOREIGN KEY (`societyId`, `companyId`) REFERENCES `Society`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OperationalRecord` ADD CONSTRAINT `OperationalRecord_residentId_companyId_fkey` FOREIGN KEY (`residentId`, `companyId`) REFERENCES `Resident`(`id`, `companyId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OperationalRecord` ADD CONSTRAINT `OperationalRecord_flatId_companyId_fkey` FOREIGN KEY (`flatId`, `companyId`) REFERENCES `Flat`(`id`, `companyId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_societyId_companyId_fkey` FOREIGN KEY (`societyId`, `companyId`) REFERENCES `Society`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillingCharge` ADD CONSTRAINT `BillingCharge_societyId_companyId_fkey` FOREIGN KEY (`societyId`, `companyId`) REFERENCES `Society`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancialPeriod` ADD CONSTRAINT `FinancialPeriod_societyId_companyId_fkey` FOREIGN KEY (`societyId`, `companyId`) REFERENCES `Society`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_societyId_companyId_fkey` FOREIGN KEY (`societyId`, `companyId`) REFERENCES `Society`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_residentId_companyId_fkey` FOREIGN KEY (`residentId`, `companyId`) REFERENCES `Resident`(`id`, `companyId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_flatId_companyId_fkey` FOREIGN KEY (`flatId`, `companyId`) REFERENCES `Flat`(`id`, `companyId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_societyId_companyId_fkey` FOREIGN KEY (`societyId`, `companyId`) REFERENCES `Society`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_invoiceId_companyId_fkey` FOREIGN KEY (`invoiceId`, `companyId`) REFERENCES `Invoice`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_societyId_companyId_fkey` FOREIGN KEY (`societyId`, `companyId`) REFERENCES `Society`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_invoiceId_companyId_fkey` FOREIGN KEY (`invoiceId`, `companyId`) REFERENCES `Invoice`(`id`, `companyId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_residentId_companyId_fkey` FOREIGN KEY (`residentId`, `companyId`) REFERENCES `Resident`(`id`, `companyId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_societyId_companyId_fkey` FOREIGN KEY (`societyId`, `companyId`) REFERENCES `Society`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_paymentId_companyId_fkey` FOREIGN KEY (`paymentId`, `companyId`) REFERENCES `Payment`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JournalEntry` ADD CONSTRAINT `JournalEntry_societyId_companyId_fkey` FOREIGN KEY (`societyId`, `companyId`) REFERENCES `Society`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JournalLine` ADD CONSTRAINT `JournalLine_societyId_companyId_fkey` FOREIGN KEY (`societyId`, `companyId`) REFERENCES `Society`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JournalLine` ADD CONSTRAINT `JournalLine_journalEntryId_companyId_fkey` FOREIGN KEY (`journalEntryId`, `companyId`) REFERENCES `JournalEntry`(`id`, `companyId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JournalLine` ADD CONSTRAINT `JournalLine_accountId_companyId_fkey` FOREIGN KEY (`accountId`, `companyId`) REFERENCES `Account`(`id`, `companyId`) ON DELETE RESTRICT ON UPDATE CASCADE;

