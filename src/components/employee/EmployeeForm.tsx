"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FormCard from "@/components/shared/FormCard";
import { apiPost } from "@/lib/api-client";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center">
      <label className="w-[150px] shrink-0 text-right text-xs pr-3" style={{ color: "#333" }}>
        {required && <span style={{ color: "#f56c6c" }}>*</span>}
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  height: "26px",
  padding: "0 8px",
  fontSize: "12px",
  border: "1px solid #ccc",
  borderRadius: "4px",
  outline: "none",
};

export default function EmployeeForm() {
  const router = useRouter();
  const [supervisors, setSupervisors] = useState<
    { id: string; name: string; employeeId: string }[]
  >([]);
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    name: "",
    namePinyin: "",
    nameEn: "",
    gender: "",
    birthDate: "",
    ethnicity: "",
    phone: "",
    password: "",
    nativePlace: "",
    politicalStatus: "",
    departmentId: "",
    position: "",
    jobLevel: "",
    supervisorId: "",
    workLocation: "",
    costCenter: "",
    entryDate: "",
    regularDate: "",
    contractType: "",
    signDate: "",
    contractPeriod: "",
    renewalRemind: false,
    contractFile: "",
    education: "",
    workHistory: "",
    projectExp: "",
    languages: "",
    certificates: "",
    skills: "",
    parentNames: "",
    parentPhones: "",
  });

  useEffect(() => {
    fetch("/api/employee/profiles/supervisors")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setSupervisors(d); })
      .catch(() => {});
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setDepartments(d); })
      .catch(() => {});
  }, []);

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await apiPost("/api/employee/profiles", {
      ...form,
      education: form.education ? JSON.parse(form.education) : null,
      workHistory: form.workHistory ? JSON.parse(form.workHistory) : null,
      projectExp: form.projectExp ? JSON.parse(form.projectExp) : null,
      languages: form.languages ? JSON.parse(form.languages) : null,
      certificates: form.certificates ? JSON.parse(form.certificates) : null,
      skills: form.skills ? JSON.parse(form.skills) : null,
    });

    setLoading(false);
    if (res.ok) {
      router.push("/employee/list");
    } else {
      const data = await res.json();
      alert(data.error || "保存失败");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: "#333" }}>
          <span className="inline-block w-[3px] h-4 rounded" style={{ backgroundColor: "#2853e0" }} />
          员工注册
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="h-[26px] px-3 text-xs border border-gray-300 rounded text-text-primary hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="h-[26px] px-3 text-xs rounded text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#2853e0" }}
          >
            {loading ? "保存中..." : "提交"}
          </button>
        </div>
      </div>

      {/* 基本信息 */}
      <FormCard title="基本信息">
        <div className="grid grid-cols-2 gap-x-4 gap-y-[14px]">
          <Field label="工号" required>
            <input style={inputStyle} value={form.employeeId} onChange={(e) => update("employeeId", e.target.value)} />
          </Field>
          <Field label="姓名" required>
            <input style={inputStyle} value={form.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <Field label="名字拼音" required>
            <input style={inputStyle} value={form.namePinyin} onChange={(e) => update("namePinyin", e.target.value)} />
          </Field>
          <Field label="英文名" required>
            <input style={inputStyle} value={form.nameEn} onChange={(e) => update("nameEn", e.target.value)} />
          </Field>
          <Field label="性别" required>
            <select style={inputStyle} value={form.gender} onChange={(e) => update("gender", e.target.value)}>
              <option value="">请选择</option>
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </Field>
          <Field label="出生日期" required>
            <input style={inputStyle} type="date" value={form.birthDate} onChange={(e) => update("birthDate", e.target.value)} />
          </Field>
          <Field label="民族" required>
            <input style={inputStyle} value={form.ethnicity} onChange={(e) => update("ethnicity", e.target.value)} />
          </Field>
          <Field label="联系方式" required>
            <input style={inputStyle} value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </Field>
          <Field label="登录密码" required>
            <input style={inputStyle} type="password" value={form.password} onChange={(e) => update("password", e.target.value)} />
          </Field>
          <Field label="籍贯" required>
            <input style={inputStyle} value={form.nativePlace} onChange={(e) => update("nativePlace", e.target.value)} />
          </Field>
          <Field label="政治面貌" required>
            <input style={inputStyle} value={form.politicalStatus} onChange={(e) => update("politicalStatus", e.target.value)} />
          </Field>
        </div>
      </FormCard>

      {/* 任职信息 */}
      <FormCard title="任职信息">
        <div className="grid grid-cols-2 gap-x-4 gap-y-[14px]">
          <Field label="所属部门" required>
            <select style={inputStyle} value={form.departmentId} onChange={(e) => update("departmentId", e.target.value)}>
              <option value="">请选择</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label="岗位" required>
            <input style={inputStyle} value={form.position} onChange={(e) => update("position", e.target.value)} />
          </Field>
          <Field label="职级" required>
            <input style={inputStyle} value={form.jobLevel} onChange={(e) => update("jobLevel", e.target.value)} />
          </Field>
          <Field label="直接上级" required>
            <select style={inputStyle} value={form.supervisorId} onChange={(e) => update("supervisorId", e.target.value)}>
              <option value="">请选择</option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.employeeId})</option>
              ))}
            </select>
          </Field>
          <Field label="工作地点" required>
            <input style={inputStyle} value={form.workLocation} onChange={(e) => update("workLocation", e.target.value)} />
          </Field>
          <Field label="成本中心" required>
            <input style={inputStyle} value={form.costCenter} onChange={(e) => update("costCenter", e.target.value)} />
          </Field>
          <Field label="入职日期" required>
            <input style={inputStyle} type="date" value={form.entryDate} onChange={(e) => update("entryDate", e.target.value)} />
          </Field>
          <Field label="转正日期" required>
            <input style={inputStyle} type="date" value={form.regularDate} onChange={(e) => update("regularDate", e.target.value)} />
          </Field>
        </div>
      </FormCard>

      {/* 合同管理 */}
      <FormCard title="合同管理">
        <div className="grid grid-cols-2 gap-x-4 gap-y-[14px]">
          <Field label="合同类型" required>
            <select style={inputStyle} value={form.contractType} onChange={(e) => update("contractType", e.target.value)}>
              <option value="">请选择</option>
              <option value="固定期限">固定期限</option>
              <option value="无固定期限">无固定期限</option>
              <option value="实习协议">实习协议</option>
            </select>
          </Field>
          <Field label="签订日期" required>
            <input style={inputStyle} type="date" value={form.signDate} onChange={(e) => update("signDate", e.target.value)} />
          </Field>
          <Field label="合同期限" required>
            <input style={inputStyle} value={form.contractPeriod} onChange={(e) => update("contractPeriod", e.target.value)} />
          </Field>
          <Field label="续签提醒">
            <input type="checkbox" checked={form.renewalRemind} onChange={(e) => update("renewalRemind", e.target.checked)} />
          </Field>
          <Field label="合同附件">
            <input style={inputStyle} value={form.contractFile} onChange={(e) => update("contractFile", e.target.value)} />
          </Field>
        </div>
      </FormCard>

      {/* 详细档案 */}
      <FormCard title="详细档案（非必填）">
        <div className="grid grid-cols-2 gap-x-4 gap-y-[14px]">
          <Field label="教育经历">
            <textarea
              className="w-full p-2 text-xs border rounded focus:outline-none"
              style={{ borderColor: "#ccc", height: "60px" }}
              value={form.education}
              onChange={(e) => update("education", e.target.value)}
              placeholder='[{"school":"北京大学","major":"计算机","degree":"本科","start":"2016","end":"2020"}]'
            />
          </Field>
          <Field label="工作履历">
            <textarea
              className="w-full p-2 text-xs border rounded focus:outline-none"
              style={{ borderColor: "#ccc", height: "60px" }}
              value={form.workHistory}
              onChange={(e) => update("workHistory", e.target.value)}
              placeholder='[{"company":"XX公司","position":"工程师","start":"2020","end":"2023"}]'
            />
          </Field>
          <Field label="项目经验">
            <textarea
              className="w-full p-2 text-xs border rounded focus:outline-none"
              style={{ borderColor: "#ccc", height: "60px" }}
              value={form.projectExp}
              onChange={(e) => update("projectExp", e.target.value)}
            />
          </Field>
          <Field label="语言能力">
            <textarea
              className="w-full p-2 text-xs border rounded focus:outline-none"
              style={{ borderColor: "#ccc", height: "60px" }}
              value={form.languages}
              onChange={(e) => update("languages", e.target.value)}
            />
          </Field>
          <Field label="职称证书">
            <textarea
              className="w-full p-2 text-xs border rounded focus:outline-none"
              style={{ borderColor: "#ccc", height: "60px" }}
              value={form.certificates}
              onChange={(e) => update("certificates", e.target.value)}
            />
          </Field>
          <Field label="技能标签">
            <textarea
              className="w-full p-2 text-xs border rounded focus:outline-none"
              style={{ borderColor: "#ccc", height: "60px" }}
              value={form.skills}
              onChange={(e) => update("skills", e.target.value)}
            />
          </Field>
        </div>
      </FormCard>

      {/* 家庭关系 */}
      <FormCard title="家庭关系（非必填）">
        <div className="grid grid-cols-2 gap-x-4 gap-y-[14px]">
          <Field label="父母姓名">
            <input style={inputStyle} value={form.parentNames} onChange={(e) => update("parentNames", e.target.value)} />
          </Field>
          <Field label="父母电话">
            <input style={inputStyle} value={form.parentPhones} onChange={(e) => update("parentPhones", e.target.value)} />
          </Field>
        </div>
      </FormCard>

      <div className="flex justify-end gap-2 mt-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="h-[26px] px-3 text-xs border border-gray-300 rounded hover:bg-gray-50"
          style={{ color: "#333" }}
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="h-[26px] px-3 text-xs rounded text-white hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#2853e0" }}
        >
          {loading ? "保存中..." : "提交"}
        </button>
      </div>
    </form>
  );
}