import React, { useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Button, Upload, Select, Table, message } from "antd";
import { UploadOutlined, FilePdfOutlined, FileZipOutlined, ClearOutlined, DownloadOutlined } from "@ant-design/icons";
import type { Item } from "./types";
import "./index.css";

const { Option } = Select;

const ExamBill: React.FC = () => {
  const [groupedData, setGroupedData] = useState<any>({});
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [subjectTitle, setSubjectTitle] = useState<string>("");

  // Currency Format
  const formatCurrency = (value: number) => {
    return `${value.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
    })}`;
  };

  const handleUpload = (file: any) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // Read all rows as an array of arrays
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
        
        let subject = "Exam Subject";
        if (rawData.length > 0 && rawData[0] && rawData[0].length > 1) {
          if (String(rawData[0][0]).trim().toLowerCase() === "subject") {
             subject = String(rawData[0][1]).trim();
          }
        }
        
        setSubjectTitle(subject);

        const grouped: any = {};
        const gradesRow = rawData[1] || [];
        
        // Loop from row 3 (which is index 3: 0=Subject, 1=Grades, 2=Headers, 3=Data)
        for (let r = 3; r < rawData.length; r++) {
           const row = rawData[r];
           if (!row || row.length === 0) continue;
           
           const customerName = String(row[0] || "").trim();
           if (!customerName) continue; // Skip empty rows
           
           if (!grouped[customerName]) {
             grouped[customerName] = [];
           }
           
           const maxCols = Math.max(row.length, gradesRow.length);
           let currentGrade = "";
           
           // Loop through column pairs for Count and Rate starting from index 1
           for (let c = 1; c < maxCols; c += 2) {
              if (gradesRow[c]) {
                 currentGrade = String(gradesRow[c]).trim();
              }
              
              const count = Number(row[c] || 0);
              const rate = Number(row[c+1] || 0);
              
              if (currentGrade && (count > 0 || rate > 0)) {
                 grouped[customerName].push({
                   CustomerName: customerName,
                   Subject: subject,
                   Item: currentGrade,
                   Quantity: count,
                   Rate: rate
                 });
              }
           }
        }

        if (Object.keys(grouped).length === 0) {
          message.warning("No data found. Please check the Excel format.");
        } else {
          message.success("Exam Bill data loaded successfully!");
        }

        setGroupedData(grouped);
        setSelectedCustomer("");
      } catch (err) {
        message.error("Error reading the Excel file.");
        console.error(err);
      }
    };

    reader.readAsBinaryString(file);
    return false; // Prevent automatic upload by antd
  };

  // Generate Single PDF
  const generatePDF = (customer: string, items: Item[]) => {
    const pdf = new jsPDF({
      unit: "mm",
      format: "a5",
      orientation: "portrait",
    });

    const invoiceNo = `EXB-${Date.now()}`;
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
    pdf.text(subjectTitle || "-", 30, y);
    y += 12;

    // Table Header
    const headerHeight = 9;
    const rowHeight = 6;
    pdf.setFillColor(240, 248, 255);
    pdf.rect(5, y - 7, 135, headerHeight, "F");

    pdf.setFont("helvetica", "bold");
    pdf.text("Grade", 10, y);
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
        pdf.text("Grade", 10, y);
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
      pdf.text("Grade", 10, y);
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
      pdf.text("Geethanjalee Bookshop", 10, footerY);
      pdf.text(`page ${page} of ${pageCount}`, pageWidth - 10, footerY, {
        align: "right",
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

      zip.file(`${customer}_ExamBill.pdf`, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "Exam_Invoices.zip");
  };

  // Table Columns
  const columns = [
    { title: "Grade", dataIndex: "Item" },
    { title: "Qty", dataIndex: "Quantity" },
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

  const selectedItems: Item[] = selectedCustomer ? groupedData[selectedCustomer] : [];
  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + (item.Quantity || 0) * (item.Rate || 0),
    0
  );

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Subject", "Exam Name"],
      ["", "Grade 06", "", "Grade 07", "", "Grade 08"],
      ["Customer", "Qty", "Rate", "Qty", "Rate", "Qty", "Rate"],
      ["Student Name", 1, 100, 1, 150, 0, 0]
    ]);
    
    // Add merges for grades
    if (!ws["!merges"]) ws["!merges"] = [];
    ws["!merges"].push({ s: { r: 1, c: 1 }, e: { r: 1, c: 2 } });
    ws["!merges"].push({ s: { r: 1, c: 3 }, e: { r: 1, c: 4 } });
    ws["!merges"].push({ s: { r: 1, c: 5 }, e: { r: 1, c: 6 } });
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Exam_Bill_Template.xlsx");
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <div className="controls-section">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Upload beforeUpload={handleUpload} showUploadList={false} accept=".xlsx, .xls">
            <Button size="large" type="primary" icon={<UploadOutlined />}>
              Upload Exam Excel
            </Button>
          </Upload>

          <Button size="large" icon={<DownloadOutlined />} onClick={downloadTemplate}>
            Download Template
          </Button>

          {Object.keys(groupedData).length > 0 && (
            <Button
              size="large"
              danger
              icon={<ClearOutlined />}
              onClick={() => {
                setGroupedData({});
                setSelectedCustomer("");
                setSubjectTitle("");
              }}
            >
              Clear Data
            </Button>
          )}
        </div>

        {Object.keys(groupedData).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              Subject: {subjectTitle}
            </div>
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
          </div>
        )}
      </div>

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

      {(selectedCustomer || Object.keys(groupedData).length > 0) && (
        <div className="action-buttons">
          {selectedCustomer && (
            <Button
              size="large"
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={() =>
                generatePDF(selectedCustomer, selectedItems).save(
                  `${selectedCustomer}_ExamBill.pdf`
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
  );
};

export default ExamBill;
