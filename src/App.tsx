import React, { useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Button, Upload, Select, Table, ConfigProvider, theme } from "antd";
import { UploadOutlined, FilePdfOutlined, FileZipOutlined, ClearOutlined } from "@ant-design/icons";
import "./index.css";

type Item = {
  CustomerName: string;
  Subject: string;
  Item: string;
  Quantity: number;
  Rate: number;
};

const { Option } = Select;

const App: React.FC = () => {
  const [groupedData, setGroupedData] = useState<any>({});
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");

  // Upload Excel
  const handleUpload = (file: any) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: Item[] = XLSX.utils.sheet_to_json(ws);

      const grouped: any = {};
      data.forEach((row) => {
        if (!grouped[row.CustomerName]) {
          grouped[row.CustomerName] = [];
        }
        grouped[row.CustomerName].push(row);
      });

      setGroupedData(grouped);
      // Reset selection when new file is uploaded
      setSelectedCustomer("");
    };

    reader.readAsBinaryString(file);
    return false; // Prevent automatic upload by antd
  };

  // Currency Format
  const formatCurrency = (value: number) => {
    return `${value.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
    })}`;
  };

  // Generate Single PDF
  const generatePDF = (customer: string, items: Item[]) => {
    const pdf = new jsPDF({
      unit: "mm",
      format: "a5",
      orientation: "portrait",
    });

    const invoiceNo = `INV-${Date.now()}`;
    const date = new Date().toLocaleDateString();

    let y = 50;

    // Header
    pdf.setFontSize(10);
    pdf.text("Invoice No:", 10, y);
    pdf.text(invoiceNo, 30, y);
    pdf.text(`Date: ${date}`, 110, y);
    y += 6;

    pdf.text("Customer :", 10, y);
    pdf.text(customer, 30, y);
    y += 6;
    pdf.text("Subject     :", 10, y);
    pdf.text(items[0]?.Subject || "-", 30, y);
    y += 12;

    // Table Header
    const headerHeight = 9;
    const rowHeight = 6;
    pdf.setFillColor(240, 248, 255);
    pdf.rect(5, y - 7, 135, headerHeight, "F");

    pdf.setFont("helvetica", "bold");
    pdf.text("Item", 10, y);
    pdf.text("Qty", 80, y, { align: "center" });
    pdf.text("Rate", 100, y, { align: "center" });
    pdf.text("Amount", 130, y, { align: "center" });
    pdf.setFont("helvetica", "normal");

    y += rowHeight;

    const pageHeight = 210;
    const maxY = pageHeight - 20;

    let total = 0;

    items.forEach((item) => {
      if (y + rowHeight > maxY) {
        pdf.addPage();
        y = 50;

        // Repeat table header on new page
        pdf.setFillColor(240, 248, 255);
        pdf.rect(5, y - 7, 135, headerHeight, "F");

        pdf.setFont("helvetica", "bold");
        pdf.text("Item", 10, y);
        pdf.text("Qty", 80, y, { align: "center" });
        pdf.text("Rate", 100, y, { align: "center" });
        pdf.text("Amount", 130, y, { align: "center" });
        pdf.setFont("helvetica", "normal");

        y += rowHeight;
      }

      pdf.text(item.Item || "-", 10, y);
      pdf.text(String(item.Quantity || 0), 80, y, { align: "center" });
      pdf.text(formatCurrency(item.Rate || 0), 105, y, { align: "right" });
      pdf.text(formatCurrency((item.Quantity || 0) * (item.Rate || 0)), 135, y, { align: "right" });

      total += (item.Quantity || 0) * (item.Rate || 0);
      y += rowHeight;
    });

    if (y + rowHeight > maxY) {
      pdf.addPage();
      y = 50;

      // Repeat table header on new page
      pdf.setFillColor(240, 248, 255);
      pdf.rect(5, y - 7, 135, headerHeight, "F");

      pdf.setFont("helvetica", "bold");
      pdf.text("Item", 10, y);
      pdf.text("Qty", 80, y, { align: "center" });
      pdf.text("Rate", 100, y, { align: "center" });
      pdf.text("Amount", 130, y, { align: "center" });
      pdf.setFont("helvetica", "normal");

      y += rowHeight;
    }

    y += rowHeight;
    pdf.setFont("helvetica", "bold");
    pdf.text(`Total: Rs. ${formatCurrency(total)}`, 135, y, { align: "right" });
    pdf.setFont("helvetica", "normal");

    const pageCount = (pdf as any).internal.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const footerY = pageHeight - 10;

    pdf.setFontSize(9);
    for (let page = 1; page <= pageCount; page += 1) {
      pdf.setPage(page);
      pdf.text(`page ${page} of ${pageCount}`, pageWidth / 2, footerY, {
        align: "center",
      });
    }

    return pdf;
  };

  // Generate ZIP with PDFs
  const downloadZIP = async () => {
    const zip = new JSZip();

    for (const customer in groupedData) {
      const pdf = generatePDF(customer, groupedData[customer]);
      const blob = pdf.output("blob");

      zip.file(`${customer}.pdf`, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "Invoices.zip");
  };

  // Table Columns
  const columns = [
    { title: "Item", dataIndex: "Item" },
    { title: "Quantity", dataIndex: "Quantity" },
    {
      title: "Rate",
      dataIndex: "Rate",
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "Amount",
      render: (_: any, record: Item) =>
        formatCurrency((record.Quantity || 0) * (record.Rate || 0)),
    },
  ];

  const selectedItems: Item[] = selectedCustomer
    ? groupedData[selectedCustomer]
    : [];
  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + (item.Quantity || 0) * (item.Rate || 0),
    0
  );

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#722ed1',
          borderRadius: 8,
          fontFamily: "'Outfit', sans-serif",
        },
      }}
    >
      <div className="app-container">
        <div className="app-header">
          <h1>🧾 Smart Bill Generator</h1>
          <p>Generate styled PDF bills quickly from your Excel data.</p>
        </div>

        <div className="controls-section">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Upload */}
            <Upload beforeUpload={handleUpload} showUploadList={false} accept=".xlsx, .xls">
              <Button size="large" type="primary" icon={<UploadOutlined />}>
                Upload Excel Data
              </Button>
            </Upload>

            {/* Reset */}
            {Object.keys(groupedData).length > 0 && (
              <Button 
                size="large" 
                danger 
                icon={<ClearOutlined />} 
                onClick={() => {
                  setGroupedData({});
                  setSelectedCustomer("");
                }}
              >
                Clear Data
              </Button>
            )}
          </div>

          {/* Customer Select */}
          {Object.keys(groupedData).length > 0 && (
            <Select
              size="large"
              placeholder="Select a Customer"
              style={{ width: 250 }}
              onChange={(value) => setSelectedCustomer(value)}
              value={selectedCustomer || undefined}
            >
              {Object.keys(groupedData).map((customer) => (
                <Option key={customer} value={customer}>
                  {customer}
                </Option>
              ))}
            </Select>
          )}
        </div>

        {/* Table */}
        {selectedCustomer && (
          <div className="table-container">
            <Table
              dataSource={selectedItems}
              columns={columns}
              rowKey={(_, index) => index!.toString()}
              pagination={false}
              bordered={false}
            />
            <div className="total-amount">
              Total Amount: Rs. {formatCurrency(totalAmount)}
            </div>
          </div>
        )}

        {/* Actions */}
        {(selectedCustomer || Object.keys(groupedData).length > 0) && (
          <div className="action-buttons">
            {selectedCustomer && (
              <Button
                size="large"
                type="primary"
                icon={<FilePdfOutlined />}
                onClick={() =>
                  generatePDF(selectedCustomer, selectedItems).save(
                    `${selectedCustomer}.pdf`
                  )
                }
              >
                Download PDF
              </Button>
            )}

            {Object.keys(groupedData).length > 0 && (
              <Button size="large" type="primary" danger icon={<FileZipOutlined />} onClick={downloadZIP}>
                Download All as ZIP
              </Button>
            )}
          </div>
        )}
      </div>
    </ConfigProvider>
  );
};

export default App;
