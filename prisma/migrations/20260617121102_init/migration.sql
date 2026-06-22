-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OWNER', 'VIEWER', 'MEMBER');

-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "org_id" INTEGER NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "org_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "session_id" TEXT,
    "user_agent" TEXT,
    "country" TEXT,
    "properties" JSONB NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Event_org_id_timestamp_idx" ON "Event"("org_id", "timestamp");

-- CreateIndex
CREATE INDEX "Event_org_id_type_timestamp_idx" ON "Event"("org_id", "type", "timestamp");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
