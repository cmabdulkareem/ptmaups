<?php
/**
 * School update content types and admin menu.
 *
 * @package PTMAUP_School_Content
 */

if (!defined('ABSPATH')) {
    exit;
}

function ptmaup_sc_post_type_labels($singular, $plural)
{
    return [
        'name' => $plural,
        'singular_name' => $singular,
        'menu_name' => $plural,
        'name_admin_bar' => $singular,
        'add_new' => __('Add new', 'ptmaup-school-content'),
        'add_new_item' => sprintf(__('Add %s', 'ptmaup-school-content'), $singular),
        'new_item' => sprintf(__('New %s', 'ptmaup-school-content'), $singular),
        'edit_item' => sprintf(__('Edit %s', 'ptmaup-school-content'), $singular),
        'view_item' => sprintf(__('View %s', 'ptmaup-school-content'), $singular),
        'all_items' => sprintf(__('All %s', 'ptmaup-school-content'), $plural),
        'search_items' => sprintf(__('Search %s', 'ptmaup-school-content'), $plural),
        'not_found' => sprintf(__('No %s found.', 'ptmaup-school-content'), strtolower($plural)),
        'not_found_in_trash' => sprintf(__('No %s found in Trash.', 'ptmaup-school-content'), strtolower($plural)),
        'item_published' => sprintf(__('%s published.', 'ptmaup-school-content'), $singular),
        'item_updated' => sprintf(__('%s updated.', 'ptmaup-school-content'), $singular),
    ];
}

function ptmaup_sc_register_content_types()
{
    $base = [
        'public' => false,
        'publicly_queryable' => false,
        'exclude_from_search' => true,
        'show_ui' => true,
        'show_in_menu' => 'ptmaup-updates',
        'show_in_rest' => false,
        'has_archive' => false,
        'rewrite' => false,
        'query_var' => false,
        'capability_type' => 'post',
        'map_meta_cap' => true,
        'hierarchical' => false,
        'delete_with_user' => false,
    ];

    register_post_type('ptmaup_announcement', array_merge($base, [
        'labels' => ptmaup_sc_post_type_labels(
            __('Announcement', 'ptmaup-school-content'),
            __('Announcements', 'ptmaup-school-content')
        ),
        'supports' => ['title'],
        'menu_position' => 1,
    ]));

    register_post_type('ptmaup_notice', array_merge($base, [
        'labels' => ptmaup_sc_post_type_labels(
            __('Notice', 'ptmaup-school-content'),
            __('Notices', 'ptmaup-school-content')
        ),
        'supports' => ['title', 'editor', 'excerpt'],
        'menu_position' => 2,
    ]));

    register_post_type('ptmaup_event', array_merge($base, [
        'labels' => ptmaup_sc_post_type_labels(
            __('Event', 'ptmaup-school-content'),
            __('Events', 'ptmaup-school-content')
        ),
        'supports' => ['title', 'editor', 'excerpt'],
        'menu_position' => 3,
    ]));

    register_post_type('ptmaup_calendar', array_merge($base, [
        'labels' => ptmaup_sc_post_type_labels(
            __('Calendar entry', 'ptmaup-school-content'),
            __('Calendar', 'ptmaup-school-content')
        ),
        'supports' => ['title'],
        'menu_position' => 4,
    ]));

    register_post_type('ptmaup_gallery', array_merge($base, [
        'labels' => ptmaup_sc_post_type_labels(
            __('Gallery collection', 'ptmaup-school-content'),
            __('Galleries', 'ptmaup-school-content')
        ),
        'supports' => ['title'],
        'menu_position' => 5,
    ]));
}
add_action('init', 'ptmaup_sc_register_content_types');

function ptmaup_sc_register_admin_menu()
{
    add_menu_page(
        __('School Updates', 'ptmaup-school-content'),
        __('School Updates', 'ptmaup-school-content'),
        'edit_posts',
        'ptmaup-updates',
        'ptmaup_sc_render_dashboard',
        'dashicons-megaphone',
        25
    );
}
add_action('admin_menu', 'ptmaup_sc_register_admin_menu', 9);
