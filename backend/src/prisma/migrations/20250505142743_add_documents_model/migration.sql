/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Document` table. All the data in the column will be lost.
  - Added the required column `filename` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parsedJson` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Made the column `extractedText` on table `Document` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "imageUrl",
ADD COLUMN     "filename" TEXT NOT NULL,
ADD COLUMN     "parsedJson" JSONB NOT NULL,
ALTER COLUMN "extractedText" SET NOT NULL;
