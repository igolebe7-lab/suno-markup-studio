-- CreateTable
CREATE TABLE "custom_tags" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "suno_text" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "description_ru" TEXT NOT NULL,
    "aliases" JSONB NOT NULL,
    "examples" JSONB NOT NULL,
    "parameters" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_tags_user_id_updated_at_idx" ON "custom_tags"("user_id", "updated_at");

-- AddForeignKey
ALTER TABLE "custom_tags" ADD CONSTRAINT "custom_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
