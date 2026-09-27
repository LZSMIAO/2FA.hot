/**
 * Hiding the interface, from the backdrop's menu or sheet: everything but the
 * backdrop fades away so the scene can be seen whole. For this visit only, so
 * a reload never opens on an empty page. InterfaceReveal.vue brings the page
 * back; the fading is in app/assets/css/ore.css.
 */
export const useInterfaceHidden = () => useState('interface-hidden', () => false)
