# Gestor de Salarios y Finanzas Personales

Una aplicación web moderna para tomar el control de tus finanzas. Gestiona salarios, ingresos adicionales, gastos, tarjetas de crédito, deudas y metas de ahorro en una interfaz intuitiva y elegante.

## Características Principales

- **Gestión de Ingresos:** Registra múltiples salarios y fuentes de ingresos adicionales.
- **Control de Gastos:** Categorización detallada con iconos personalizados.
- **Tarjetas de Crédito:** Seguimiento de saldos, límites y fechas de corte. Protege tu historial de crédito.
- **Deudas y Préstamos:** Visualiza tus obligaciones y monitorea el progreso de pago.
- **Metas de Ahorro:** Establece objetivos financieros y realiza un seguimiento automático.
- **Análisis (Insights):** Gráficos y resúmenes para entender a dónde va tu dinero.

## Tecnologías

- **Framework:** [Next.js](https://nextjs.org) (App Router)
- **Lenguaje:** TypeScript
- **Base de Datos:** SQLite / PostgreSQL (vía Prisma ORM)
- **Estilos:** Tailwind CSS
- **Iconos:** Lucide React

## Cómo Iniciar

1.  **Instalar dependencias:**
    ```bash
    npm install
    ```

2.  **Configurar Base de Datos:**
    Asegúrate de tener tu archivo `.env` configurado. Luego ejecuta:
    ```bash
    npx prisma generate
    npx prisma db push
    ```

3.  **Iniciar Servidor de Desarrollo:**
    ```bash
    npm run dev
    ```

    Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Despliegue

Este proyecto está optimizado para ser desplegado en [Vercel](https://vercel.com). Consulta la [documentación de Next.js](https://nextjs.org/docs/deployment) para más detalles.
