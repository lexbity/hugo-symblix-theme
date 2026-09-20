+++
title = "التهيئة"
description = "تهيئة القالب وهيكل المحتوى والإعدادات الأساسية."
weight = 20
related = ["/ar/docs/latest/getting-started/", "/ar/docs/latest/navigation/"]
+++

التهيئة هي المكان الذي يتحول فيه القالب إلى موقعك أنت بدلًا من موقع المثال.

## إعداد Hugo الأدنى

هذا هو الشكل الأبسط العملي لموقع Symblix:

```toml
baseURL = "https://example.com/"
title = "My Docs"
theme = "hugo-theme-symblix"
defaultContentLanguage = "ar"
defaultContentLanguageInSubdir = true

[params.docs]
root = "docs"
rightToc = true

[params.docs.nav]
mode = "manual"
data = "docs_nav"
```

## هيكل المحتوى

الموقع يعتمد على شجرة بسيطة من صفحات Markdown:

```txt
content/
  ar/
    docs/
      latest/
        _index.md
        getting-started.md
        configuration.md
        navigation.md
```

استخدم folders و`_index.md` لمجموعات التنقل، واستخدم `weight` لترتيب الصفحات، ودع Hugo يبني الشجرة.

## ما الذي لا تحتاج إلى تهيئته

{{< warning title="ميزات وقت التشغيل أزيلت" >}}
الإصدار النهائي الثابت لا يحتاج إلى إعداد البحث الحي أو تبديل المظهر أو زر نسخ الشيفرة أو حفظ حالة الشريط الجانبي. هذه الطبقات أزيلت عمدًا في مرحلة التنظيف.
{{< /warning >}}

