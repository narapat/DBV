# DBV - PostgreSQL Schema Visualizer

DBV is a lightweight, interactive web application designed to visualize PostgreSQL database schemas. It generates dynamic ER diagrams using Mermaid.js and provides a searchable schema browser for detailed table inspections.

![License](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)

## ✨ Features

- **Interactive ER Diagrams:** Automatically generates Mermaid-style Entity Relationship diagrams.
- **Smart Column Ordering:** Primary Keys (PK) and Foreign Keys (FK) are prioritized at the top of each table, followed by alphabetically sorted columns.
- **Schema Browser:** A resizable and collapsible bottom panel to search and browse all tables in your database.
- **Bi-directional Highlighting:** Click an entity in the diagram to view its details, or select a table in the browser to highlight it in the diagram.
- **Navigation Controls:** Integrated zoom, pan, and fit-to-screen controls for large schemas.
- **Export Options:**
    - **SVG:** Download the full ER diagram as a high-quality vector image.
    - **Markdown:** Generate and export a complete Data Dictionary in Markdown format.
- **Full Width Layout:** Responsive UI that maximizes screen real estate.

<img width="1440" height="748" alt="image" src="https://github.com/user-attachments/assets/dc4c6c46-8865-4399-949e-e86a34b68fd9" />


## 🚀 Tech Stack

- **Frontend:** React (Vite), Mermaid.js, SVG-Pan-Zoom, Lucide Icons, Axios.
- **Backend:** Node.js, Express, `pg` (node-postgres).
- **Styling:** Vanilla CSS (Modern, Sidebar-centric layout).

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16+)
- PostgreSQL (Local or Remote)

### 1. Clone the repository
```bash
git clone https://github.com/narapat/DBV.git
cd DBV
```

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=your_database
```
Start the backend server:
```bash
node server.js
```
The backend will run on `http://localhost:3002`.

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`.

## 📖 Usage

1. Open your browser to `http://localhost:5173`.
2. Ensure the **PostgreSQL Connection** details in the sidebar match your local database.
3. Click **Fetch & Visualize**.
4. **Interact:** Click on table boxes to see detailed structures, or use the **Schema Browser** at the bottom to search for specific tables.
5. **Export:** Use the buttons in the sidebar to download your diagram or data dictionary.

## 📄 License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/narapat/DBV/issues).
