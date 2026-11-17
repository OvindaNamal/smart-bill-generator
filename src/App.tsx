import React, { useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Button, Upload, Select, Table, ConfigProvider, theme, Tabs, DatePicker } from "antd";
import { UploadOutlined, FilePdfOutlined, FileZipOutlined, ClearOutlined, DownloadOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import ManualEntry from "./ManualEntry";
import ExamBill from "./ExamBill";
import type { Item, Letterhead } from "./types";
import { GEETHANJALEE_LETTERHEAD, SANDAMINI_LETTERHEAD } from "./assets/letterheadData";
import "./index.css";

const { Option } = Select;

const App: React.FC = () => {
  const [groupedData, setGroupedData] = useState<any>({});
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [billDate, setBillDate] = useState<Dayjs | null>(dayjs());

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
  const generatePDF = (
    customer: string,
    items: Item[],
    customDate?: string,
    letterhead: Letterhead = "none"
  ) => {
    const pdf = new jsPDF({
      unit: "mm",
      format: "a5",
      orientation: "portrait",
      compress: true,
    });

    // Add letterhead if selected
    if (letterhead === "geethanjalee") {
      pdf.addImage(GEETHANJALEE_LETTERHEAD, "PNG", 10, 6, 128, 37, undefined, "FAST");
    } else if (letterhead === "sandamini") {
      pdf.addImage(SANDAMINI_LETTERHEAD, "PNG", 10, 6, 128, 37, undefined, "FAST");
    }

    const invoiceNo = `INV-${Date.now()}`;
    const date = customDate || (billDate ? billDate.format("DD MMMM YYYY") : dayjs().format("DD MMMM YYYY"));

    let y = 50;

    // Header
    pdf.setFontSize(10);
    pdf.text("Invoice No:", 10, y);
    pdf.text(invoiceNo, 30, y);
    pdf.text(`Date: ${date}`, 138, y, { align: "right" });
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
      if (letterhead === "geethanjalee") {
        pdf.text("Geethanjalee Bookshop", 10, footerY);
      } else if (letterhead === "sandamini") {
        pdf.text("Sandamini Bookshop", 10, footerY);
      }
      pdf.text(`page ${page} of ${pageCount}`, pageWidth - 10, footerY, {
        align: "right",
      });
    }

    return pdf;
  };

  // Generate ZIP with PDFs
  const downloadZIP = async () => {
    const zip = new JSZip();
    const formattedDate = billDate ? billDate.format("DD MMMM YYYY") : dayjs().format("DD MMMM YYYY");

    for (const customer in groupedData) {
      const pdf = generatePDF(customer, groupedData[customer], formattedDate);
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

  const handleManualGenerate = (
    customerName: string,
    items: Item[],
    customDate?: string,
    letterhead: Letterhead = "none"
  ) => {
    const pdf = generatePDF(customerName, items, customDate, letterhead);
    pdf.save(`${customerName}.pdf`);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { CustomerName: "John Doe", Subject: "Mathematics", Item: "Textbook", Quantity: 2, Rate: 500 },
      { CustomerName: "John Doe", Subject: "Mathematics", Item: "Notebook", Quantity: 5, Rate: 100 },
      { CustomerName: "Jane Smith", Subject: "Science", Item: "Lab Coat", Quantity: 1, Rate: 1200 }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Standard_Bill_Template.xlsx");
  };

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
          <p>Generate styled PDF bills quickly from your Excel data or manual entry.</p>
        </div>

        <Tabs
          defaultActiveKey="1"
          centered
          items={[
            {
              key: '1',
              label: 'From Excel',
              children: (
                <>
                  <div className="controls-section">
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Upload */}
                      <Upload beforeUpload={handleUpload} showUploadList={false} accept=".xlsx, .xls">
                        <Button size="large" type="primary" icon={<UploadOutlined />}>
                          Upload Excel Data
                        </Button>
                      </Upload>

                      {/* Date Picker */}
                      <DatePicker
                        size="large"
                        value={billDate}
                        onChange={(date) => setBillDate(date || dayjs())}
                        format="DD MMMM YYYY"
                        placeholder="Select Bill Date"
                        allowClear={false}
                        style={{ minWidth: 190 }}
                      />

                      {/* Download Template */}
                      <Button size="large" icon={<DownloadOutlined />} onClick={downloadTemplate}>
                        Download Template
                      </Button>

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
                </>
              )
            },
            {
              key: '2',
              label: 'Manual Entry',
              children: <ManualEntry onGenerate={handleManualGenerate} />
            },
            {
              key: '3',
              label: 'Exam Bill',
              children: <ExamBill />
            }
          ]}
        />

        <div className="app-footer">
          Powered by Geethanjalee
        </div>
      </div>
    </ConfigProvider>
  );
};

export default App;
