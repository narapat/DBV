import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import mermaid from 'mermaid';
import svgPanZoom from 'svg-pan-zoom';
import { 
  Database, RefreshCw, FileText, Image as ImageIcon, 
  ZoomIn, ZoomOut, Maximize, ChevronLeft, ChevronRight, 
  Menu, X, Table, ChevronDown, ChevronUp, GripHorizontal, Search
} from 'lucide-react';
import './App.css';

// Configure Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#f1f5f9',
    primaryBorderColor: '#94a3b8',
    primaryTextColor: '#1e293b',
    lineColor: '#64748b',
    fontSize: '13px',
    tertiaryTextColor: '#ff0000',
    attributeBackgroundColor: '#ffffff',
    attributeFontSize: '12px',
  },
  themeCSS: `
    .er.entityBox { fill: #f8fafc !important; stroke: #cbd5e1 !important; cursor: pointer !important; pointer-events: all !important; transition: all 0.2s; }
    .er.entityBox:hover { fill: #eff6ff !important; stroke: #3b82f6 !important; }
    .er.entityLabel { fill: #1e293b !important; font-weight: 600 !important; cursor: pointer !important; pointer-events: all !important; }
    
    /* Highlight Style */
    .entity-highlight .er.entityBox { 
      fill: #dbeafe !important; 
      stroke: #2563eb !important; 
      stroke-width: 2px !important;
    }
    .entity-highlight .er.entityLabel {
      fill: #1e40af !important;
    }

    .er.relationshipLabel { fill: #ff0000 !important; }
    .er.relationshipLabelBox { fill: none !important; stroke: none !important; }
    [id^="attribute"] { fill: #1e293b !important; }
  `
});

function App() {
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null); // format: "schema.table"
  const [bottomPanelHeight, setBottomPanelHeight] = useState(window.innerHeight * 0.3);
  const [isBottomCollapsed, setIsBottomCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '',
    database: ''
  });

  const panZoomRef = useRef(null);
  const containerRef = useRef(null);
  const isResizing = useRef(false);

  const fetchSchema = async () => {
    setLoading(true);
    setError(null);
    setSelectedTable(null);
    try {
      const response = await axios.post('http://localhost:3002/api/schema', { dbConfig });
      setSchema(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch schema');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('http://localhost:3002/api/test-connection', dbConfig);
      if (response.data.success) alert('Connection successful!');
      else setError(response.data.error);
    } catch (err) {
      setError(err.response?.data?.error || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const generateMermaidString = (data) => {
    if (!data) return '';
    let diagram = 'erDiagram\n';
    const tables = data.columns.reduce((acc, col) => {
      const key = `${col.table_schema}.${col.table_name}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(col);
      return acc;
    }, {});

    Object.entries(tables).forEach(([tableKey, columns]) => {
      const safeId = tableKey.replace(/\./g, '_');
      diagram += `    ${safeId}["${tableKey}"] {\n`;
      
      // Sort columns: PK first, then FK, then alphabetically
      const sortedColumns = [...columns].sort((a, b) => {
        const aIsPK = a.constraint_type === 'PK';
        const bIsPK = b.constraint_type === 'PK';
        if (aIsPK && !bIsPK) return -1;
        if (!aIsPK && bIsPK) return 1;

        const aIsFK = data.foreignKeys.some(fk => fk.table_name === a.table_name && fk.column_name === a.column_name);
        const bIsFK = data.foreignKeys.some(fk => fk.table_name === b.table_name && fk.column_name === b.column_name);
        if (aIsFK && !bIsFK) return -1;
        if (!aIsFK && bIsFK) return 1;

        return a.column_name.localeCompare(b.column_name);
      });
      
      sortedColumns.forEach(col => {
        const name = col.column_name;
        const type = col.data_type.replace(/ /g, '_');
        let constraint = col.constraint_type === 'PK' ? 'PK' : '';
        if (!constraint && data.foreignKeys.some(fk => fk.table_name === col.table_name && fk.column_name === col.column_name)) {
          constraint = 'FK';
        }
        diagram += `        ${name} ${type} ${constraint}\n`;
      });
      diagram += '    }\n';
    });

    data.foreignKeys.forEach(fk => {
      const srcSchema = data.columns.find(c => c.table_name === fk.table_name)?.table_schema || 'public';
      const destSchema = data.columns.find(c => c.table_name === fk.foreign_table_name)?.table_schema || 'public';
      const srcId = `${srcSchema}_${fk.table_name}`;
      const destId = `${destSchema}_${fk.foreign_table_name}`;
      diagram += `    ${srcId} }o--|| ${destId} : "${fk.column_name}"\n`;
    });
    return diagram;
  };

  useEffect(() => {
    const renderDiagram = async () => {
      if (schema) {
        const diagramString = generateMermaidString(schema);
        const container = containerRef.current;
        if (container) {
          try {
            container.innerHTML = '';
            const id = `mermaid-svg-${Date.now()}`;
            const { svg } = await mermaid.render(id, diagramString);
            container.innerHTML = svg;
            const svgElement = container.querySelector('svg');
            if (svgElement) {
              svgElement.style.width = '100%';
              svgElement.style.height = '100%';
              panZoomRef.current = svgPanZoom(svgElement, {
                zoomEnabled: true, controlIconsEnabled: false,
                fit: true, center: true, minZoom: 0.1, maxZoom: 10,
              });
            }
          } catch (err) {
            console.error('Render error:', err);
            setError('Error rendering diagram');
          }
        }
      }
    };
    renderDiagram();
    return () => { if (panZoomRef.current) panZoomRef.current.destroy(); };
  }, [schema]);

  // Handle entity highlighting when selectedTable changes
  useEffect(() => {
    if (schema && containerRef.current) {
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        // Clear previous highlights
        svg.querySelectorAll('.entity-highlight').forEach(el => el.classList.remove('entity-highlight'));
        
        if (selectedTable) {
          const safeId = selectedTable.replace(/\./g, '_');
          // Mermaid groups entities in <g> tags with IDs like "entity-schema_table-0" or similar
          // More reliably, we can find the g tag that contains the text of our table name
          const labels = svg.querySelectorAll('.er.entityLabel');
          labels.forEach(label => {
            if (label.textContent === selectedTable) {
              // The parent <g> usually contains both the box and the label
              label.parentElement.classList.add('entity-highlight');
              
              // Also highlight the attributes group if it exists (next sibling usually)
              // But highlighting the parent group is usually enough for the box and title
            }
          });
        }
      }
    }
  }, [selectedTable, schema]);

  useEffect(() => {
    const handleContainerClick = (e) => {
      const target = e.target.closest('.er.entityLabel, .er.entityBox');
      if (target) {
        let tableName = '';
        if (target.classList.contains('entityLabel')) {
          tableName = target.textContent;
        } else {
          const label = target.parentElement.querySelector('.entityLabel');
          if (label) tableName = label.textContent;
        }
        
        if (tableName) {
          setSelectedTable(tableName);
          setIsBottomCollapsed(false);
        }
      }
    };
    const container = containerRef.current;
    if (container) container.addEventListener('click', handleContainerClick);
    return () => { if (container) container.removeEventListener('click', handleContainerClick); };
  }, [schema]);

  const startResizing = useCallback(() => { isResizing.current = true; }, []);
  const stopResizing = useCallback(() => { isResizing.current = false; }, []);
  const resize = useCallback((e) => {
    if (isResizing.current) {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
        setBottomPanelHeight(newHeight);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  useEffect(() => {
    const handleResize = () => {
      if (panZoomRef.current) {
        panZoomRef.current.resize();
        panZoomRef.current.fit();
        panZoomRef.current.center();
      }
    };
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 350); 
    return () => { window.removeEventListener('resize', handleResize); clearTimeout(timer); };
  }, [isCollapsed, isBottomCollapsed, schema]);

  const handleZoomIn = () => panZoomRef.current?.zoomIn();
  const handleZoomOut = () => panZoomRef.current?.zoomOut();
  const handleReset = () => { panZoomRef.current?.resetZoom(); panZoomRef.current?.center(); };

  const exportAsSVG = () => {
    const svgElement = document.querySelector('#mermaid-container svg');
    if (!svgElement) return;
    const exportSvg = svgElement.cloneNode(true);
    const svgData = new XMLSerializer().serializeToString(exportSvg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `schema-diagram-${new Date().getTime()}.svg`;
    link.click();
  };

  const exportAsMarkdown = () => {
    if (!schema) return;
    let md = `# Data Dictionary: ${dbConfig.database}\n\n`;
    const tables = schema.columns.reduce((acc, col) => {
      const key = `${col.table_schema}.${col.table_name}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(col);
      return acc;
    }, {});
    Object.entries(tables).forEach(([tableKey, columns]) => {
      md += `## Table: ${tableKey}\n\n| Column Name | Data Type | Constraint |\n| --- | --- | --- |\n`;
      columns.forEach(col => {
        let constraint = col.constraint_type === 'PK' ? 'PK' : '';
        if (!constraint && schema.foreignKeys.some(fk => fk.table_name === col.table_name && fk.column_name === col.column_name)) {
          constraint = 'FK';
        }
        md += `| ${col.column_name} | ${col.data_type} | ${constraint} |\n`;
      });
      md += '\n';
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data-dictionary-${dbConfig.database}-${new Date().getTime()}.md`;
    link.click();
  };

  const tableList = schema ? Array.from(new Set(schema.columns.map(c => `${c.table_schema}.${c.table_name}`))).sort() : [];
  const filteredTables = tableList.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className={`app-container ${isCollapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          {!isCollapsed && <div className="brand"><Database size={24} color="var(--primary-color)" /><h2>DB Visualizer</h2></div>}
          <button className="collapse-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>{isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}</button>
        </div>
        {!isCollapsed && (
          <div className="sidebar-content">
            <div className="section">
              <label className="section-label">PostgreSQL Connection</label>
              <div className="form-group">
                <input type="text" placeholder="Host" value={dbConfig.host} onChange={e => setDbConfig({...dbConfig, host: e.target.value})} />
                <input type="number" placeholder="Port" value={dbConfig.port} onChange={e => setDbConfig({...dbConfig, port: parseInt(e.target.value)})} />
                <input type="text" placeholder="Database" value={dbConfig.database} onChange={e => setDbConfig({...dbConfig, database: e.target.value})} />
                <input type="text" placeholder="User" value={dbConfig.user} onChange={e => setDbConfig({...dbConfig, user: e.target.value})} />
                <input type="password" placeholder="Password" value={dbConfig.password} onChange={e => setDbConfig({...dbConfig, password: e.target.value})} />
              </div>
            </div>
            <div className="actions-stack">
              <button className="secondary" onClick={testConnection} disabled={loading}>Test Connection</button>
              <button className="primary" onClick={fetchSchema} disabled={loading}>{loading ? <RefreshCw className="animate-spin" size={16} /> : 'Fetch & Visualize'}</button>
            </div>
            {error && <div className="error-box">{error}</div>}
            <hr />
            <div className="section">
              <label className="section-label">Export</label>
              <button className="secondary" onClick={exportAsSVG} disabled={!schema}><ImageIcon size={16} /> SVG Diagram</button>
              <button className="secondary" onClick={exportAsMarkdown} disabled={!schema}><FileText size={16} /> Data Dictionary</button>
            </div>
          </div>
        )}
      </aside>

      <main className="main-content">
        <header className="header">
          <span className="stats">{schema ? `${tableList.length} Tables in [${dbConfig.database}]` : 'No schema loaded'}</span>
          {schema && <div className="toolbar"><button onClick={handleZoomIn}><ZoomIn size={18} /></button><button onClick={handleZoomOut}><ZoomOut size={18} /></button><button onClick={handleReset}><Maximize size={18} /></button></div>}
        </header>

        <div className="viewer-split">
          <div className="canvas-area" style={{ flex: 1 }}>
            {loading && <div className="loading-overlay">Processing...</div>}
            <div id="mermaid-container" ref={containerRef}>
              {!schema && !loading && <div className="empty-state"><Database size={48} /><p>Configure your database and click "Fetch & Visualize"</p></div>}
            </div>
          </div>

          {schema && (
            <div className={`bottom-panel ${isBottomCollapsed ? 'collapsed' : ''}`} style={{ height: isBottomCollapsed ? '40px' : `${bottomPanelHeight}px` }}>
              <div className="resizer" onMouseDown={startResizing}><GripHorizontal size={16} /></div>
              <div className="panel-header" onClick={() => setIsBottomCollapsed(!isBottomCollapsed)}>
                <div className="title"><Table size={18} /> <span>Schema Browser: {dbConfig.database}</span></div>
                {isBottomCollapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
              {!isBottomCollapsed && (
                <div className="panel-content">
                  <div className="table-list-sidebar">
                    <div className="search-box"><Search size={14} /><input type="text" placeholder="Search tables..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                    <div className="list">
                      {filteredTables.map(t => (
                        <div key={t} className={`list-item ${selectedTable === t ? 'active' : ''}`} onClick={() => setSelectedTable(t)}>{t}</div>
                      ))}
                    </div>
                  </div>
                  <div className="table-details">
                    {selectedTable ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <h3 style={{ margin: 0 }}>{selectedTable}</h3>
                          <span className="stats" style={{ fontSize: '0.75rem' }}>{dbConfig.database}</span>
                        </div>
                        <table className="structure-table">
                          <thead><tr><th>Column Name</th><th>Data Type</th><th>Nullable</th><th>Constraint</th></tr></thead>
                          <tbody>
                            {schema.columns.filter(c => `${c.table_schema}.${c.table_name}` === selectedTable).map((col, idx) => {
                              let constraint = col.constraint_type === 'PK' ? 'PK' : '';
                              if (!constraint && schema.foreignKeys.some(fk => fk.table_name === col.table_name && fk.column_name === col.column_name)) {
                                constraint = 'FK';
                              }
                              return (
                                <tr key={idx}>
                                  <td className="font-mono">{col.column_name}</td>
                                  <td className="text-secondary">{col.data_type}</td>
                                  <td className="text-center">{col.is_nullable}</td>
                                  <td className="text-center">{constraint && <span className={`badge badge-${constraint.toLowerCase()}`}>{constraint}</span>}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </>
                    ) : (
                      <div className="no-selection"><Table size={32} /><p>Select a table from the list or diagram to view details</p></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
