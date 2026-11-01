ALTER TABLE "Categoria"
ADD COLUMN "clientMutationId" TEXT;

CREATE UNIQUE INDEX "Categoria_clientMutationId_key"
ON "Categoria"("clientMutationId");

ALTER TABLE "Producto"
ADD COLUMN "clientMutationId" TEXT;

CREATE UNIQUE INDEX "Producto_clientMutationId_key"
ON "Producto"("clientMutationId");

ALTER TABLE "Proveedor"
ADD COLUMN "clientMutationId" TEXT;

CREATE UNIQUE INDEX "Proveedor_clientMutationId_key"
ON "Proveedor"("clientMutationId");
