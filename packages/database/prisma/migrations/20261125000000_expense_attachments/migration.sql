-- CreateTable
CREATE TABLE `ExpenseAttachment` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `societyId` CHAR(36) NOT NULL,
    `expenseId` CHAR(36) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(120) NOT NULL,
    `size` INT NOT NULL,
    `kind` VARCHAR(40) NOT NULL DEFAULT 'BILL',
    `data` LONGBLOB NOT NULL,
    `uploadedBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExpenseAttachment_companyId_societyId_expenseId_idx`(`companyId`, `societyId`, `expenseId`),
    INDEX `ExpenseAttachment_expenseId_kind_idx`(`expenseId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ExpenseAttachment` ADD CONSTRAINT `ExpenseAttachment_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `MaintenanceExpense`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
