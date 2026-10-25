<?php
/**
 * Shared validation and formatting helpers.
 *
 * @package PTMAUP_School_Content
 */

if (!defined('ABSPATH')) {
    exit;
}

function ptmaup_sc_length($value)
{
    $value = (string) $value;
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function ptmaup_sc_truncate($value, $maximum)
{
    $value = trim((string) $value);
    if (ptmaup_sc_length($value) <= $maximum) {
        return $value;
    }
    $slice = function_exists('mb_substr')
        ? mb_substr($value, 0, max(1, $maximum - 1), 'UTF-8')
        : substr($value, 0, max(1, $maximum - 1));
    return rtrim($slice) . '…';
}

function ptmaup_sc_plain_text($value)
{
    $value = strip_shortcodes((string) $value);
    $value = preg_replace('/<\/(?:p|h[1-6]|li|blockquote|div)>/i', '$0' . "\n\n", $value);
    $value = preg_replace('/<br\s*\/?>/i', "\n", $value);
    $value = wp_strip_all_tags($value);
    $value = html_entity_decode($value, ENT_QUOTES, 'UTF-8');
    $value = str_replace(["\r\n", "\r", "\xC2\xA0"], ["\n", "\n", ' '], $value);
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value);
    return trim($value);
}

function ptmaup_sc_paragraphs($content)
{
    $text = ptmaup_sc_plain_text($content);
    if ($text === '') {
        return [];
    }
    $blocks = preg_split('/\n\s*\n/', $text);
    $paragraphs = [];
    foreach ($blocks as $block) {
        $paragraph = trim(preg_replace('/[ \t]+/', ' ', $block));
        if ($paragraph !== '') {
            $paragraphs[] = $paragraph;
        }
    }
    return $paragraphs;
}

function ptmaup_sc_plain_title($post)
{
    $title = html_entity_decode(get_the_title($post), ENT_QUOTES, 'UTF-8');
    $title = trim(preg_replace('/\s+/', ' ', wp_strip_all_tags($title)));
    return $title;
}

function ptmaup_sc_excerpt_source($post)
{
    $excerpt = trim(preg_replace('/\s+/', ' ', wp_strip_all_tags(strip_shortcodes((string) $post->post_excerpt))));
    if ($excerpt !== '') {
        return html_entity_decode($excerpt, ENT_QUOTES, 'UTF-8');
    }
    $content = trim(preg_replace('/\s+/', ' ', ptmaup_sc_plain_text($post->post_content)));
    return $content;
}

function ptmaup_sc_categories()
{
    return [
        'ptmaup_notice' => ['General', 'Academic', 'Admissions', 'Events', 'Holidays'],
        'ptmaup_event' => ['Announcements', 'Academic', 'Activities', 'Events'],
        'ptmaup_calendar' => ['General', 'Academic', 'Admissions', 'Activities', 'Announcements', 'Events', 'Holidays'],
    ];
}

function ptmaup_sc_allowed_category($post_type, $category)
{
    $categories = ptmaup_sc_categories();
    return isset($categories[$post_type]) && in_array($category, $categories[$post_type], true);
}

function ptmaup_sc_is_valid_date($value)
{
    $value = (string) $value;
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        return false;
    }
    try {
        $date = new DateTimeImmutable($value . ' 00:00:00', new DateTimeZone('UTC'));
    } catch (Exception $error) {
        return false;
    }
    return $date->format('Y-m-d') === $value;
}

function ptmaup_sc_is_valid_year($value)
{
    $value = (string) $value;
    if (!preg_match('/^\d{4}$/', $value)) {
        return false;
    }
    $year = (int) $value;
    return $year >= 1000 && $year <= 9999;
}

function ptmaup_sc_get_photo_ids($post_id)
{
    $stored = get_post_meta($post_id, 'ptmaup_photo_ids', true);
    if (!is_array($stored)) {
        return [];
    }
    $ids = [];
    foreach ($stored as $candidate) {
        $id = absint($candidate);
        if ($id && !in_array($id, $ids, true) && wp_attachment_is_image($id)) {
            $ids[] = $id;
        }
    }
    return $ids;
}

function ptmaup_sc_attachment_alt($attachment_id)
{
    return trim((string) get_post_meta($attachment_id, '_wp_attachment_image_alt', true));
}

function ptmaup_sc_attachment_consent($attachment_id)
{
    return get_post_meta($attachment_id, 'ptmaup_consent', true) === '1';
}

function ptmaup_sc_attachment_reference($attachment_id)
{
    return trim((string) get_post_meta($attachment_id, 'ptmaup_consent_reference', true));
}

function ptmaup_sc_attachment_issues($attachment_id)
{
    $issues = [];
    if (!wp_attachment_is_image($attachment_id)) {
        $issues[] = 'file';
    }
    if (ptmaup_sc_length(ptmaup_sc_attachment_alt($attachment_id)) < 8) {
        $issues[] = 'alt';
    }
    if (!ptmaup_sc_attachment_consent($attachment_id)) {
        $issues[] = 'consent';
    }
    if (ptmaup_sc_attachment_reference($attachment_id) === '') {
        $issues[] = 'reference';
    }
    return $issues;
}

function ptmaup_sc_issue_labels($issues)
{
    $labels = [
        'file' => __('The file is not a usable image.', 'ptmaup-school-content'),
        'alt' => __('Alternative text is missing or shorter than 8 characters.', 'ptmaup-school-content'),
        'consent' => __('Consent is not recorded.', 'ptmaup-school-content'),
        'reference' => __('The consent reference is missing.', 'ptmaup-school-content'),
    ];
    $output = [];
    foreach ($issues as $issue) {
        if (isset($labels[$issue])) {
            $output[] = $labels[$issue];
        }
    }
    return $output;
}

function ptmaup_sc_post_id($post)
{
    $slug = isset($post->post_name) ? (string) $post->post_name : '';
    if (preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug) && ptmaup_sc_length($slug) <= 60) {
        return $slug;
    }
    return 'post-' . (int) $post->ID;
}

function ptmaup_sc_content_issues($post)
{
    $issues = [];
    $type = get_post_type($post);

    if ($type === 'ptmaup_announcement') {
        $message = trim((string) get_post_meta($post->ID, 'ptmaup_message', true));
        if ($message === '') {
            $issues[] = __('The announcement message is empty.', 'ptmaup-school-content');
        } elseif (ptmaup_sc_length($message) > 240) {
            $issues[] = __('The announcement is longer than 240 characters.', 'ptmaup-school-content');
        }
        return $issues;
    }

    $title = ptmaup_sc_plain_title($post);
    if ($title === '') {
        $issues[] = __('A title is required.', 'ptmaup-school-content');
    } elseif (ptmaup_sc_length($title) > 140) {
        $issues[] = __('The title is longer than 140 characters.', 'ptmaup-school-content');
    }

    if (in_array($type, ['ptmaup_notice', 'ptmaup_event', 'ptmaup_calendar'], true)) {
        $date = (string) get_post_meta($post->ID, 'ptmaup_date', true);
        if (!ptmaup_sc_is_valid_date($date)) {
            $issues[] = __('Add a valid date.', 'ptmaup-school-content');
        }
        $category = (string) get_post_meta($post->ID, 'ptmaup_category', true);
        if (!ptmaup_sc_allowed_category($type, $category)) {
            $issues[] = __('Choose a category.', 'ptmaup-school-content');
        }
    }

    if ($type === 'ptmaup_notice' || $type === 'ptmaup_event') {
        $excerpt = ptmaup_sc_excerpt_source($post);
        if ($excerpt === '') {
            $issues[] = __('Add a summary or full text so a short excerpt can be shown.', 'ptmaup-school-content');
        } elseif (ptmaup_sc_length($excerpt) > 320) {
            $issues[] = __('The summary will be shortened to 320 characters.', 'ptmaup-school-content');
        }
        $paragraphs = ptmaup_sc_paragraphs($post->post_content);
        if (!$paragraphs) {
            $issues[] = __('Add the full text in the editor.', 'ptmaup-school-content');
        }
        if (count($paragraphs) > 12) {
            $issues[] = __('Use no more than 12 paragraphs.', 'ptmaup-school-content');
        }
        $total = 0;
        foreach ($paragraphs as $paragraph) {
            $length = ptmaup_sc_length($paragraph);
            $total += $length;
            if ($length > 1500) {
                $issues[] = __('A paragraph is longer than 1500 characters.', 'ptmaup-school-content');
            }
        }
        if ($total > 6000) {
            $issues[] = __('The full text is longer than 6000 characters.', 'ptmaup-school-content');
        }
    }

    if ($type === 'ptmaup_calendar') {
        $description = trim((string) get_post_meta($post->ID, 'ptmaup_description', true));
        if (ptmaup_sc_length($description) > 500) {
            $issues[] = __('The description is longer than 500 characters.', 'ptmaup-school-content');
        }
    }

    if ($type === 'ptmaup_gallery') {
        $year = (string) get_post_meta($post->ID, 'ptmaup_year', true);
        $full_date = (string) get_post_meta($post->ID, 'ptmaup_date_full', true);
        if (!ptmaup_sc_is_valid_year($year) && !ptmaup_sc_is_valid_date($full_date)) {
            $issues[] = __('Add a year or an exact date.', 'ptmaup-school-content');
        }
        $description = trim((string) get_post_meta($post->ID, 'ptmaup_description', true));
        if (ptmaup_sc_length($description) > 600) {
            $issues[] = __('The description is longer than 600 characters.', 'ptmaup-school-content');
        }
        $notes = get_post_meta($post->ID, 'ptmaup_notes', true);
        if (is_array($notes)) {
            if (count($notes) > 4) {
                $issues[] = __('Use no more than 4 highlights.', 'ptmaup-school-content');
            }
            foreach ($notes as $note) {
                if (ptmaup_sc_length($note) > 240) {
                    $issues[] = __('A highlight is longer than 240 characters.', 'ptmaup-school-content');
                }
            }
        }
        $photo_issues = 0;
        foreach (ptmaup_sc_get_photo_ids($post->ID) as $attachment_id) {
            if (ptmaup_sc_attachment_issues($attachment_id)) {
                $photo_issues += 1;
            }
        }
        if ($photo_issues) {
            $issues[] = sprintf(
                _n(
                    '%d photograph will not appear until its consent, reference and alternative text are complete.',
                    '%d photographs will not appear until their consent, reference and alternative text are complete.',
                    $photo_issues,
                    'ptmaup-school-content'
                ),
                $photo_issues
            );
        }
    }

    return $issues;
}
