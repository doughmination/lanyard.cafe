# embedding the widget

Add the following snippet anywhere in your site's HTML. It injects a fixed widget in the bottom-left corner with prev / random / next navigation.

```html
<script src="https://lanyard.cafe/api/embed.js"></script>
```

## dark mode

Pass `data-theme="dark"` to get the dark variant of the widget:

```html
<script src="https://lanyard.cafe/api/embed.js" data-theme="dark"></script>
```

## how it works

The script detects your site's hostname, looks it up in the ring, and renders the navigation links. If your site is not yet a member, it falls back to a random position in the ring.

The widget has no external dependencies and adds no tracking. It's a single self-contained script.

You can also look through it to take the links directly!
