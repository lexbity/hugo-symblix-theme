+++
title = "المرجع"
description = "كتل مرجعية منظمة للإعدادات وواجهات البرمجة والأوامر ورموز الحالة."
docType = "reference"
weight = 55
+++

{{< hero eyebrow="مكونات المرجع" title="مرجع منظم" subtitle="استبدل الجداول الخام بعناصر مرجعية قابلة للمسح والربط." headingLevel="2" primaryHref="/ar/docs/latest/components/" primaryLabel="العودة إلى المكونات" secondaryHref="/ar/docs/latest/technical-content/" secondaryLabel="عرض المحتوى التقني" >}}
{{< /hero >}}

{{< config-option name="params.docs.rightToc" type="boolean" default="true" since="v1.0" >}}
يتحكم في إظهار جدول المحتويات في الجهة اليمنى في صفحات الوثائق.
{{< /config-option >}}

{{< param name="title" type="string" required=true >}}
العنوان الظاهر للمكوّن أو الصفحة.
{{< /param >}}

{{< property name="versions[].id" type="string" required=true since="v1.0" >}}
مقطع المسار في الرابط ومفتاح الإصدار الداخلي المستخدم للتوجيه وتبديل الإصدارات.
{{< /property >}}

{{< env-var name="HUGO_ENV" default="production" >}}
يتحكم في بيئة بناء Hugo ويمكن استخدامه لتغيير سلوك البناء.
{{< /env-var >}}

{{< cli-command name="docworkbench audit" >}}
يفحص محتوى الوثائق ويبلغ عن الروابط المكسورة والصفحات القديمة والبيانات الوصفية المفقودة.

```sh
docworkbench audit ./exampleSite
```
{{< /cli-command >}}

{{< http-endpoint method="GET" path="/v1/projects/{id}" auth="required" since="v1.0" >}}
يعيد مشروعًا بواسطة المعرف.
{{< /http-endpoint >}}

{{< status-code code="404" label="Not Found" >}}
المشروع المطلوب غير موجود أو أن الجهة المتصلة لا تملك إذن الوصول إليه.
{{< /status-code >}}
