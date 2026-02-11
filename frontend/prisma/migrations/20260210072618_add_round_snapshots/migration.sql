-- CreateTable
CREATE TABLE "RoundSnapshot" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionText" TEXT,
    "optionA" TEXT,
    "optionB" TEXT,
    "answerCountA" INTEGER NOT NULL DEFAULT 0,
    "answerCountB" INTEGER NOT NULL DEFAULT 0,
    "minorityAnswer" TEXT,
    "majorityAnswer" TEXT,
    "survivorsBefore" INTEGER NOT NULL,
    "survivorsAfter" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundElimination" (
    "id" TEXT NOT NULL,
    "roundSnapshotId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "eliminatedReason" TEXT NOT NULL,
    "eliminatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundElimination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameResult" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "winnerEmail" TEXT,
    "tierEmails" TEXT[],
    "finalRound" INTEGER NOT NULL,
    "totalRounds" INTEGER NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoundSnapshot_roomId_roundNumber_idx" ON "RoundSnapshot"("roomId", "roundNumber");

-- CreateIndex
CREATE INDEX "RoundSnapshot_createdAt_idx" ON "RoundSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "RoundElimination_roundSnapshotId_idx" ON "RoundElimination"("roundSnapshotId");

-- CreateIndex
CREATE INDEX "RoundElimination_userEmail_idx" ON "RoundElimination"("userEmail");

-- CreateIndex
CREATE INDEX "GameResult_roomId_idx" ON "GameResult"("roomId");

-- CreateIndex
CREATE INDEX "GameResult_endedAt_idx" ON "GameResult"("endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameResult_roomId_key" ON "GameResult"("roomId");

-- AddForeignKey
ALTER TABLE "RoundElimination" ADD CONSTRAINT "RoundElimination_roundSnapshotId_fkey" FOREIGN KEY ("roundSnapshotId") REFERENCES "RoundSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
