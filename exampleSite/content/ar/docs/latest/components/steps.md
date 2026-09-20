+++
title = "الخطوات"
description = "تدفقات مرتبة للدروس والإعداد والترحيل."
weight = 13
+++

{{< steps start=1 >}}

{{< step title="إنشاء الموقع" status="مطلوب" >}}
```sh
hugo new site my-docs
```
{{< /step >}}

{{< step title="إضافة القالب" status="مطلوب" >}}
```sh
git submodule add https://github.com/example/hugo-theme-symblix themes/hugo-theme-symblix
```
{{< /step >}}

{{< step title="إضافة المحتوى" optional=true >}}
اكتب صفحات الوثائق الأولى وربطها بالشريط الجانبي.
{{< /step >}}

{{< /steps >}}
