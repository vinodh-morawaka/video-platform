/*
  Warnings:

  - A unique constraint covering the columns `[muxLiveStreamId]` on the table `Channel` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "VideoStatus" ADD VALUE 'LIVE';

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "livePlaybackId" TEXT,
ADD COLUMN     "muxLiveStreamId" TEXT,
ADD COLUMN     "muxStreamKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Channel_muxLiveStreamId_key" ON "Channel"("muxLiveStreamId");
