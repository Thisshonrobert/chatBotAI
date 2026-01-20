-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "author" VARCHAR(255) NOT NULL,
    "rating" SMALLINT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" INTEGER NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "summaries" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "summaries_productId_key" ON "summaries"("productId");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
