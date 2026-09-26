# Builds locales/en.default.schema.json (the theme editor's labels) from every "t:" key used in
# sections/ and config/. Hand-written text below; any plain ".label" not listed is made from its setting id.
# Run: python scripts/build-schema-locale.py
import json, os, re, glob
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

TEXT = {
 # section and block names
 'sections.announcement-bar.name': 'Announcement bar', 'sections.announcement-bar.blocks.announcement.name': 'Announcement',
 'sections.azal-sky.name': 'Sky & bottle (hero)', 'sections.azal-sky.presets.name': 'Sky & bottle (hero)',
 'sections.azal-origins.name': 'Origins (pinned story)', 'sections.azal-origins.presets.name': 'Origins (pinned story)', 'sections.azal-origins.blocks.chapter.name': 'Chapter',
 'sections.azal-notes.name': 'Fragrance notes', 'sections.azal-notes.presets.name': 'Fragrance notes',
 'sections.azal-collection.name': 'Collection slider', 'sections.azal-collection.presets.name': 'Collection slider',
 'sections.azal-finale.name': 'Finale', 'sections.azal-finale.presets.name': 'Finale',
 'sections.cart-drawer.name': 'Cart drawer', 'sections.contact-form.name': 'Contact form', 'sections.contact-form.presets.name': 'Contact form',
 'sections.customers.account': 'Account', 'sections.customers.activate': 'Activate account', 'sections.customers.addresses': 'Addresses',
 'sections.customers.login': 'Login', 'sections.customers.order': 'Order', 'sections.customers.register': 'Register', 'sections.customers.reset': 'Reset password',
 'sections.featured-collection.name': 'Product grid', 'sections.featured-collection.presets.name': 'Product grid',
 'sections.footer.name': 'Footer', 'sections.footer.blocks.menu.name': 'Menu', 'sections.footer.blocks.newsletter.name': 'Email signup',
 'sections.footer.blocks.social.name': 'Social links', 'sections.footer.blocks.text.name': 'Text',
 'sections.header.name': 'Header', 'sections.image-with-text.name': 'Image with text', 'sections.image-with-text.presets.name': 'Image with text',
 'sections.main-404.name': '404 page', 'sections.main-article.name': 'Blog post', 'sections.main-blog.name': 'Blog posts', 'sections.main-cart.name': 'Cart',
 'sections.main-collection.name': 'Product grid', 'sections.main-list-collections.name': 'Collections list', 'sections.main-page.name': 'Page',
 'sections.main-password.name': 'Password page', 'sections.main-product.name': 'Product information', 'sections.main-search.name': 'Search results',
 'sections.main-product.blocks.buy_buttons.name': 'Buy buttons', 'sections.main-product.blocks.character.name': 'Character',
 'sections.main-product.blocks.collapsible.name': 'Collapsible tab', 'sections.main-product.blocks.description.name': 'Description',
 'sections.main-product.blocks.eyebrow.name': 'Eyebrow', 'sections.main-product.blocks.notes.name': 'Fragrance notes',
 'sections.main-product.blocks.price.name': 'Price', 'sections.main-product.blocks.text.name': 'Text', 'sections.main-product.blocks.title.name': 'Title',
 'sections.main-product.blocks.variant_picker.name': 'Variant picker',
 'sections.newsletter.name': 'Email signup', 'sections.newsletter.presets.name': 'Email signup',
 'sections.product-recommendations.name': 'Product recommendations',
 'sections.rich-text.name': 'Rich text', 'sections.rich-text.presets.name': 'Rich text',
 'sections.rich-text.blocks.button.name': 'Button', 'sections.rich-text.blocks.eyebrow.name': 'Eyebrow', 'sections.rich-text.blocks.heading.name': 'Heading', 'sections.rich-text.blocks.text.name': 'Text',
 # headers and paragraphs
 'sections.azal-sky.settings.paragraph.content': 'The film at the top of the home page: scroll descends through the clouds to the bottle. Leave the images empty to use the theme’s painted sky.',
 'sections.azal-sky.settings.header_bottle.content': 'Bottle', 'sections.azal-sky.settings.header_manifesto.content': 'Manifesto', 'sections.azal-sky.settings.header_scene.content': 'Scene',
 'sections.azal-sky.settings.heading.info': 'Leave empty to use the store name.',
 'sections.azal-sky.settings.bottle_image.info': 'A PNG with a transparent background, about 1000 × 1286 px. Leave empty to use the theme’s turning bottle.',
 'sections.azal-sky.settings.image_sky.info': 'Replaces the painted dawn sky. 2560 × 1440 px or larger.',
 'sections.azal-sky.settings.manifesto.info': 'One line per row. Each line rises on its own.',
 'sections.azal-sky.settings.product.label': 'Bottle links to product',
 'sections.azal-sky.settings.keep_clouds.label': 'Keep the painted clouds over a custom sky',
 'sections.azal-sky.settings.length.label': 'Scroll length',
 'sections.azal-notes.settings.paragraph.content': 'Notes are read from the product’s metafields (custom.notes_top, custom.notes_heart, custom.notes_base) when they exist; otherwise from the fields below.',
 'sections.azal-notes.settings.header_notes.content': 'Notes', 'sections.azal-notes.settings.header_bottle.content': 'Bottle layers', 'sections.azal-notes.settings.header_art.content': 'Ingredients and colours',
 'sections.azal-notes.settings.title.info': 'Leave empty to use the product title.',
 'sections.azal-notes.settings.bottle_top.info': 'Three transparent PNGs of the same bottle, filled to the top note, the heart and full. Leave empty to use the theme’s bottle.',
 'sections.azal-notes.settings.ing_top.info': 'Optional cut-out images (transparent PNG) that rise behind the bottle for each note.',
 'sections.azal-notes.settings.bottle_top.label': 'Bottle — top note', 'sections.azal-notes.settings.bottle_heart.label': 'Bottle — heart note', 'sections.azal-notes.settings.bottle_full.label': 'Bottle — full',
 'sections.azal-notes.settings.ing_top.label': 'Top note ingredient', 'sections.azal-notes.settings.ing_heart.label': 'Heart note ingredient', 'sections.azal-notes.settings.ing_base.label': 'Base note ingredient',
 'sections.azal-notes.settings.tint_top.label': 'Ground — top', 'sections.azal-notes.settings.tint_heart.label': 'Ground — heart', 'sections.azal-notes.settings.tint_base.label': 'Ground — base',
 'sections.azal-notes.settings.name_top.label': 'Top label', 'sections.azal-notes.settings.name_heart.label': 'Heart label', 'sections.azal-notes.settings.name_base.label': 'Base label',
 'sections.azal-notes.settings.notes_top.label': 'Top notes', 'sections.azal-notes.settings.notes_heart.label': 'Heart notes', 'sections.azal-notes.settings.notes_base.label': 'Base notes',
 'sections.azal-notes.settings.show_ingredients.label': 'Show rising ingredients',
 'sections.azal-origins.blocks.chapter.settings.image.info': '16:9, 2560 × 1440 px. Leave empty to use the theme’s photography.',
 'sections.azal-origins.blocks.chapter.settings.image_mobile.label': 'Image on phones (portrait)',
 'sections.azal-finale.settings.image.info': 'Replaces the painted dusk.', 'sections.azal-finale.settings.link.info': 'Leave empty to scroll back to the top.',
 'sections.azal-finale.settings.top.label': 'First line', 'sections.azal-finale.settings.bottom.label': 'Second line (italic)', 'sections.azal-finale.settings.cta.label': 'Button label',
 'sections.azal-collection.settings.limit.label': 'Products to show',
 'sections.footer.blocks.social.settings.paragraph.content': 'Add your links in Theme settings → Social media.',
 'sections.footer.settings.note.label': 'Note after the copyright', 'sections.footer.settings.show_payment.label': 'Show payment icons', 'sections.footer.settings.show_powered_by.label': 'Show "Powered by Shopify"',
 'sections.header.settings.split_menu.label': 'Split the menu around the emblem', 'sections.header.settings.split_menu.info': 'Half the links sit on each side of the centred emblem.',
 'sections.header.settings.ink_on_home.label': 'Dark text over the home hero', 'sections.header.settings.ink_on_home.info': 'Use when your hero image is light.',
 'sections.header.settings.show_language.label': 'Show language switch', 'sections.header.settings.show_currency.label': 'Show country / currency in the menu',
 'sections.main-collection.settings.enable_filtering.info': 'Set up filters with the Search & Discovery app.',
 'sections.main-collection.settings.first_wide.label': 'First product spans two columns', 'sections.main-collection.settings.footer_heading.label': 'Note heading', 'sections.main-collection.settings.footer_text.label': 'Note under the grid',
 'sections.featured-collection.settings.first_wide.label': 'First product spans two columns',
 'sections.main-product.blocks.character.settings.paragraph.content': 'Shows the product metafield custom.character (for example “Timeless”).',
 'sections.main-product.blocks.notes.settings.paragraph.content': 'Shows the product metafields custom.notes_top, custom.notes_heart and custom.notes_base.',
 'sections.main-product.blocks.eyebrow.settings.text.info': 'Leave empty to show the product type.',
 'sections.main-product.blocks.buy_buttons.settings.show_dynamic_checkout.label': 'Show dynamic checkout buttons',
 'sections.main-product.blocks.buy_buttons.settings.show_pickup.label': 'Show pickup availability',
 'sections.main-product.settings.show_thumbs.label': 'Show image thumbnails',
 'sections.main-product.blocks.collapsible.settings.source.label': 'Content',
 'sections.main-product.blocks.collapsible.settings.source.options__1.label': 'Text below', 'sections.main-product.blocks.collapsible.settings.source.options__2.label': 'Product story (metafield custom.story)',
 'sections.main-product.blocks.collapsible.settings.source.options__3.label': 'How to wear (metafield custom.how_to_wear)', 'sections.main-product.blocks.collapsible.settings.source.options__4.label': 'A page',
 'sections.common.scheme.label': 'Colours', 'sections.common.scheme.options__1.label': 'Ivory', 'sections.common.scheme.options__2.label': 'Wine', 'sections.common.scheme.options__3.label': 'Blush',
 'sections.common.align.label': 'Alignment', 'sections.common.align.options__1.label': 'Start', 'sections.common.align.options__2.label': 'Centre',
 'sections.image-with-text.settings.flip.label': 'Image on the other side',
 'sections.main-cart.settings.show_additional.label': 'Show accelerated checkout buttons',
 # global settings
 'settings_schema.logo.name': 'Logo', 'settings_schema.logo.settings.logo.info': 'Leave empty to use the AZAL emblem. The name is always the store name.',
 'settings_schema.colors.name': 'Colours', 'settings_schema.colors.settings.header_light.content': 'Light grounds', 'settings_schema.colors.settings.header_dark.content': 'Dark grounds',
 'settings_schema.colors.settings.header_accents.content': 'Accents', 'settings_schema.colors.settings.color_card_bg.info': 'Behind product images when a product has no colour of its own (metafield custom.background_color).',
 'settings_schema.colors.settings.color_ivory.label': 'Ivory (page background)', 'settings_schema.colors.settings.color_ink.label': 'Ink (text)', 'settings_schema.colors.settings.color_card_bg.label': 'Product card background',
 'settings_schema.colors.settings.color_wine.label': 'Wine', 'settings_schema.colors.settings.color_wine_deep.label': 'Deep wine (dark background)', 'settings_schema.colors.settings.color_cream.label': 'Cream (text on dark)',
 'settings_schema.colors.settings.color_blush.label': 'Blush', 'settings_schema.colors.settings.color_apricot.label': 'Apricot', 'settings_schema.colors.settings.color_success.label': 'Success', 'settings_schema.colors.settings.color_error.label': 'Error',
 'settings_schema.typography.name': 'Typography', 'settings_schema.typography.settings.type_mode.label': 'Fonts',
 'settings_schema.typography.settings.type_mode.info': 'House fonts: Cormorant and Hanken Grotesk, with Amiri and IBM Plex Sans Arabic for Arabic. Custom: pick from the Shopify font library.',
 'settings_schema.typography.settings.type_mode.options__1.label': 'House fonts', 'settings_schema.typography.settings.type_mode.options__2.label': 'Custom',
 'settings_schema.typography.settings.type_header_font.label': 'Heading font (custom)', 'settings_schema.typography.settings.type_body_font.label': 'Body font (custom)',
 'settings_schema.layout.name': 'Layout', 'settings_schema.motion.name': 'Motion',
 'settings_schema.motion.settings.paragraph.content': 'Visitors who ask their device for reduced motion always get calm, still versions of every scene.',
 'settings_schema.motion.settings.enable_loader.label': 'Opening loader on the home page', 'settings_schema.motion.settings.enable_smooth_scroll.label': 'Smooth scrolling',
 'settings_schema.motion.settings.enable_page_transitions.label': 'Veil between pages', 'settings_schema.motion.settings.enable_cursor.label': 'Custom cursor',
 'settings_schema.motion.settings.enable_petals.label': 'Floating petals', 'settings_schema.motion.settings.enable_grain.label': 'Film grain',
 'settings_schema.products.name': 'Product cards', 'settings_schema.products.settings.paragraph.content': 'Each product can carry its own colour and character through metafields — see the setup guide.',
 'settings_schema.products.settings.card_show_character.label': 'Show character (metafield custom.character)',
 'settings_schema.products.settings.card_image_fit.options__1.label': 'Whole bottle (contain)', 'settings_schema.products.settings.card_image_fit.options__2.label': 'Fill (cover)',
 'settings_schema.cart.name': 'Cart', 'settings_schema.cart.settings.cart_type.label': 'Cart type',
 'settings_schema.cart.settings.cart_type.options__1.label': 'Drawer', 'settings_schema.cart.settings.cart_type.options__2.label': 'Page',
 'settings_schema.cart.settings.cart_gift_wrap.label': 'Offer gift wrapping', 'settings_schema.cart.settings.cart_gift_wrap.info': 'Saved on the order as the attribute “Gift wrapping: Yes”.',
 'settings_schema.cart.settings.cart_note.label': 'Enable gift message / order note', 'settings_schema.cart.settings.cart_shipping_note.label': 'Short note under the totals',
 # labels that read badly when made from ids
 'sections.announcement-bar.settings.text_color.label': 'Text colour',
 'sections.azal-collection.settings.label.label': 'Eyebrow', 'sections.azal-notes.settings.label.label': 'Eyebrow', 'sections.azal-origins.settings.label.label': 'Eyebrow',
 'sections.azal-collection.settings.view_all.label': '“View all” link label',
 'sections.azal-notes.settings.product.label': 'Fragrance', 'sections.azal-origins.blocks.chapter.settings.name.label': 'Chapter name',
 'sections.azal-sky.settings.bottle_alt.label': 'Bottle description (for screen readers)', 'sections.azal-sky.settings.bottle_image.label': 'Custom bottle image',
 'sections.azal-sky.settings.cta_label.label': 'Button label', 'sections.azal-sky.settings.heading.label': 'Brand name',
 'sections.azal-sky.settings.image_sky.label': 'Custom sky image', 'sections.azal-sky.settings.manifesto.label': 'Manifesto text',
 'sections.azal-sky.settings.manifesto_link_label.label': 'Link under the manifesto (optional)', 'sections.azal-sky.settings.scroll_label.label': 'Scroll hint',
 'sections.featured-collection.settings.limit.label': 'Products to show', 'sections.featured-collection.settings.show_view_all.label': 'Show “View all” link',
 'sections.header.settings.show_account.label': 'Show account link', 'sections.header.settings.show_search.label': 'Show search link',
 'sections.image-with-text.settings.button_link.label': 'Button link',
 'sections.main-collection.settings.per_page.label': 'Products per page', 'sections.main-collection.settings.show_description.label': 'Show collection description',
 'sections.product-recommendations.settings.limit.label': 'Products to show',
 'settings_schema.products.settings.card_image_fit.label': 'Image fit', 'settings_schema.products.settings.card_quick_add.label': 'Show quick add',
 'settings_schema.products.settings.card_show_vendor.label': 'Show vendor when there is no character',
 'settings_schema.social.settings.social_tiktok_link.label': 'TikTok', 'settings_schema.social.settings.social_youtube_link.label': 'YouTube',
 'settings_schema.social.name': 'Social media', 'settings_schema.social.settings.social_twitter_link.label': 'X (Twitter)', 'settings_schema.social.settings.social_whatsapp.label': 'WhatsApp link',
}

def humanize(key):
    parts = key.split('.')
    word = parts[-2] if parts[-1] in ('label', 'content', 'name') else parts[-1]
    word = re.sub(r'^(social|color|type|card|cart|show|enable)_', lambda m: '' if m.group(1) in ('social', 'color') else m.group(0), word)
    word = word.replace('_link', '').replace('_', ' ').strip()
    return word[:1].upper() + word[1:]

keys = set()
for f in glob.glob(os.path.join(root, 'sections', '*.liquid')) + [os.path.join(root, 'config', 'settings_schema.json')]:
    keys |= set(re.findall(r'"t:([^"]+)"', open(f, encoding='utf-8').read()))

tree, auto = {}, []
for k in sorted(keys):
    v = TEXT.get(k)
    if v is None:
        v = humanize(k)
        auto.append(k)
    node = tree
    for p in k.split('.')[:-1]:
        node = node.setdefault(p, {})
    node[k.split('.')[-1]] = v
with open(os.path.join(root, 'locales', 'en.default.schema.json'), 'w', encoding='utf-8') as f:
    json.dump(tree, f, ensure_ascii=False, indent=2)
    f.write('\n')
print(len(keys), 'keys;', len(auto), 'labels made from ids')
