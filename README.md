# Data Alchemist 🧪

**Data Alchemist** is an intelligent, AI-powered web application designed to streamline the complex process of resource allocation planning. It transforms messy, disparate spreadsheet data for clients, workers, and tasks into a clean, validated, and rule-configured dataset, ready for downstream processing.

This tool is built for non-technical users, abstracting away the complexity of data validation and business rule creation through an intuitive UI and a powerful AI assistant.

**[Live Demo Link Here]** <!-- Add your Vercel deployment link here! -->

---

## ✨ Key Features

### 1. Seamless Data Ingestion & Management
- **Universal File Upload:** Supports uploading `.csv` and `.xlsx` files for clients, workers, and tasks.
- **Smart Entity Recognition:** Automatically identifies the data type (clients, workers, tasks) based on file content, regardless of filename.
- **Interactive Data Grids:** Displays all data in editable tables, allowing for quick, on-the-fly corrections and updates.

### 2. Comprehensive Validation Engine
- **Standard Validation:** Automatically runs a suite of over 10 critical validation checks on file upload and data edits, such as:
  - Duplicate ID detection
  - Out-of-range value checks (e.g., Priority Level)
  - Malformed data formats (e.g., invalid JSON, non-numeric lists)
  - Broken references (e.g., a client requesting a non-existent task)
- **Rule-Based Validation:** Dynamically validates the data against all user-defined business rules, flagging conflicts like:
  - Incomplete `co-run` task requests by a client.
  - `Slot-restriction` violations where a group lacks common availability.
  - `Phase-window` conflicts where a rule contradicts a task's preferred phases.
- **Live Feedback:** Errors are instantly highlighted directly on the problematic cells in the data grid and summarized in a central `ValidationSummary` component.

### 3. Advanced Rule Creation
- **Manual Rule Builder:** An intuitive, accordion-style UI allows for the manual creation of specific business rules:
  - **Co-run:** Define tasks that must be scheduled together.
  - **Slot Restriction:** Enforce minimum common availability for a group.
  - **Load Limit:** Set a maximum workload for a worker group.
  - **Phase Window:** Restrict a task to a specific list of phases.
- **AI-Powered Rule Generation:** Convert natural language into structured JSON rules. Simply type a rule like *"Make sure tasks T3 and T5 always run at the same time,"* and the AI handles the rest.

### 4. The AI Assistant 🤖
A multi-talented assistant that provides deep insights and proactive help.
- **Strategic Analysis:** Goes beyond simple validation to provide high-level strategic insights on the entire dataset, identifying potential bottlenecks, skill gaps, or planning inconsistencies.
- **Rule Suggestions:** Scans the data for common patterns and proactively suggests new, relevant business rules to improve the configuration.
- **AI-Powered Error Correction:** For detected validation errors, the AI suggests concrete, one-click fixes. It's smart enough to know whether to **replace** a value (like a typo) or **append** to an existing list (like adding a missing skill).

### 5. Configuration & Export
- **Prioritization Sliders:** An intuitive editor to assign relative weights to different criteria (e.g., client priority vs. worker fairness) for the downstream allocation engine.
- **Validated Data Export:** Export the cleaned, validated, and rule-adherent data, along with a `rules.json` configuration file, ensuring the output is ready for the next stage of processing.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (React)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [Shadcn/ui](https://ui.shadcn.com/)
- **AI Integration:** [Groq API](https://groq.com/) (for high-speed language model inference)
- **File Parsing:** [SheetJS (xlsx)](https://sheetjs.com/)
- **Notifications:** [React Hot Toast](https://react-hot-toast.com/)
- **Icons:** [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites
- Node.js (v18.x or later)
- npm or yarn

### Installation & Setup

1.  **Clone the Repository**
    ```bash
    git clone [https://github.com/your-username/data-alchemist.git](https://github.com/your-username/data-alchemist.git)
    cd data-alchemist
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set Up Environment Variables**
    The application requires an API key from Groq to power its AI features.
    - Create a file named `.env.local` in the root of your project.
    - Go to the [GroqCloud Console](https://console.groq.com/keys) to get your free API key.
    - Add the key to your `.env.local` file:
      ```
      GROQ_API_KEY=your_groq_api_key_here
      ```

4.  **Run the Development Server**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

---

## 📋 Usage

1.  **Upload Data:** Begin by uploading your `clients`, `workers`, and `tasks` files using the designated upload cards.
2.  **Review & Edit:** View the uploaded data in the tables. Make any necessary inline edits by clicking on a cell.
3.  **Check Validation:** Observe the `ValidationSummary` for any errors. Errors will also be highlighted on the specific cells in the tables.
4.  **Define Rules:** Navigate to the `RuleBuilder` to create business logic, either manually or by describing it to the AI.
5.  **Leverage the AI Assistant:**
    - Use **Strategic Analysis** to get high-level feedback.
    - Use **Rule Suggestions** to find new optimization opportunities.
    - Use **Error Correction** to get one-click fixes for validation errors.
6.  **Set Priorities:** Adjust the sliders in the `PrioritizationEditor` to define what's most important for your allocation.
7.  **Export:** Once all validation lights are green, click the `Export` button to download your cleaned data and `rules.json` file.

---

## ☁️ Deployment

This project is optimized for deployment on **Vercel**. For a complete, step-by-step guide, please refer to the [Deployment Guide](./DEPLOYMENT.md).

<!-- You can create a new DEPLOYMENT.md file and paste the content from the deployment guide I provided earlier. -->

---

## 📂 Project Structure

A brief overview of the key directories in this project:

/src
├── app/
│   ├── api/ai/route.ts   # The backend API route that connects to the Groq AI service.
│   └── page.tsx          # The main page component containing all UI and core logic.
├── components/
│   ├── ui/               # Reusable UI components (from Shadcn/ui).
│   ├── AiAssistant.tsx   # The main component for all AI-powered features.
│   ├── DataTable.tsx     # The interactive data grid component.
│   └── RuleBuilder.tsx   # The component for creating business rules.
└── lib/
├── parsers.ts        # Logic for parsing uploaded CSV/XLSX files.
├── types.ts          # All TypeScript type definitions and interfaces.
└── validators.ts     # The core data and rule validation engine.


